package com.example.margemAI.service;

import com.example.margemAI.dto.request.MeiObligationReminderRequest;
import com.example.margemAI.dto.request.MeiObligationStatusUpdateRequest;
import com.example.margemAI.dto.response.MeiObligationResponse;
import com.example.margemAI.dto.response.MeiObligationScheduleResponse;
import com.example.margemAI.dto.response.MeiOfficialLinkResponse;
import com.example.margemAI.exception.InvalidRequestException;
import com.example.margemAI.exception.ResourceNotFoundException;
import com.example.margemAI.model.MeiObligation;
import com.example.margemAI.model.MeiObligationStatus;
import com.example.margemAI.model.MeiObligationType;
import com.example.margemAI.model.User;
import com.example.margemAI.repository.MeiObligationRepository;
import com.example.margemAI.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MeiObligationService {

    public static final String VERIFICATION_SOURCE = "MANUAL_DECLARATION";
    public static final String REGULARITY_DISCLAIMER =
            "O registro neste painel é apenas um controle interno declaratório do MEI e não comprova nem atesta regularidade fiscal perante a Receita Federal.";

    public static final String PGMEI_OFFICIAL_URL =
            "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao";
    public static final String DASN_SIMEI_OFFICIAL_URL =
            "https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/dasnsimei.app/Identificacao";
    public static final String PORTAL_EMPREENDEDOR_OFFICIAL_URL =
            "https://www.gov.br/empresas-e-negocios/pt-br/empreendedor";

    private static final String[] MONTH_NAMES = {
            "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    };

    private final MeiObligationRepository meiObligationRepository;
    private final UserRepository userRepository;

    @Transactional
    public MeiObligationScheduleResponse getSchedule(UUID userId, Integer requestedYear) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        int year = requestedYear != null ? requestedYear : LocalDate.now().getYear();
        validateYear(year);

        LocalDate today = LocalDate.now();
        List<MeiObligation> obligations = ensureYearSchedule(user, year, today);
        return buildScheduleResponse(year, obligations, today);
    }

    @Transactional
    public MeiObligationResponse updateObligationStatus(
            UUID userId,
            UUID obligationId,
            MeiObligationStatusUpdateRequest request) {
        MeiObligation obligation = meiObligationRepository.findByIdAndUserId(obligationId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Obrigação MEI não encontrada."));

        if (request == null || request.getStatus() == null) {
            throw new InvalidRequestException("O status da obrigação é obrigatório.");
        }

        LocalDate today = LocalDate.now();

        if (request.getStatus() == MeiObligationStatus.PAID_DECLARED) {
            String receiptCode = trimOrNull(request.getManualReceiptCode());
            if (receiptCode == null) {
                throw new InvalidRequestException(
                        "Informe a identificação ou código do comprovante para registrar o cumprimento manual da obrigação."
                );
            }
            LocalDate paidAt = request.getPaidAt() != null ? request.getPaidAt() : today;
            if (paidAt.isAfter(today)) {
                throw new InvalidRequestException("A data do comprovante não pode ser futura.");
            }
            obligation.setStatus(MeiObligationStatus.PAID_DECLARED);
            obligation.setManualReceiptCode(receiptCode);
            obligation.setPaidAt(paidAt);
            obligation.setNotes(trimOrNull(request.getNotes()));
        } else {
            obligation.setManualReceiptCode(null);
            obligation.setPaidAt(null);
            obligation.setNotes(trimOrNull(request.getNotes()));
            obligation.setStatus(
                    obligation.getDueDate().isBefore(today)
                            ? MeiObligationStatus.OVERDUE
                            : MeiObligationStatus.PENDING
            );
        }

        MeiObligation saved = meiObligationRepository.save(obligation);
        return toResponse(saved, today);
    }

    @Transactional
    public MeiObligationScheduleResponse updateReminderSettings(
            UUID userId,
            MeiObligationReminderRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        if (request == null || request.getReminderDaysBefore() == null) {
            throw new InvalidRequestException("A antecedência do lembrete é obrigatória.");
        }
        int reminderDays = request.getReminderDaysBefore();
        if (reminderDays < 1 || reminderDays > 30) {
            throw new InvalidRequestException("A antecedência do lembrete deve estar entre 1 e 30 dias.");
        }

        int year = request.getYear() != null ? request.getYear() : LocalDate.now().getYear();
        validateYear(year);

        LocalDate today = LocalDate.now();
        ensureYearSchedule(user, year, today);

        List<MeiObligation> allUserObligations = meiObligationRepository.findByUserId(userId);
        for (MeiObligation obligation : allUserObligations) {
            obligation.setReminderDaysBefore(reminderDays);
        }
        meiObligationRepository.saveAll(allUserObligations);

        List<MeiObligation> yearObligations = allUserObligations.stream()
                .filter(item -> Integer.valueOf(year).equals(item.getReferenceYear()))
                .sorted(obligationComparator())
                .toList();

        return buildScheduleResponse(year, yearObligations, today);
    }

    public List<MeiOfficialLinkResponse> getOfficialLinks() {
        return List.of(
                MeiOfficialLinkResponse.builder()
                        .id("pgmei")
                        .label("PGMEI — Emissão do DAS")
                        .description("Programa Gerador de Documento de Arrecadação do Simples Nacional para o MEI (Receita Federal).")
                        .url(PGMEI_OFFICIAL_URL)
                        .verified(true)
                        .build(),
                MeiOfficialLinkResponse.builder()
                        .id("dasn-simei")
                        .label("DASN-SIMEI — Declaração Anual")
                        .description("Declaração Anual Simplificada para o Microempreendedor Individual referente ao ano-calendário anterior.")
                        .url(DASN_SIMEI_OFFICIAL_URL)
                        .verified(true)
                        .build(),
                MeiOfficialLinkResponse.builder()
                        .id("portal-empreendedor")
                        .label("Portal do Empreendedor (Gov.br)")
                        .description("Canal oficial do Governo Federal com orientações, serviços e consulta de obrigações do MEI.")
                        .url(PORTAL_EMPREENDEDOR_OFFICIAL_URL)
                        .verified(true)
                        .build()
        );
    }

    private List<MeiObligation> ensureYearSchedule(User user, int year, LocalDate today) {
        List<MeiObligation> existing = new ArrayList<>(
                meiObligationRepository.findByUserIdAndReferenceYearOrderByDueDateAsc(user.getId(), year)
        );

        int reminderDays = resolveReminderDays(user.getId(), existing);
        Set<String> existingKeys = existing.stream()
                .map(item -> item.getObligationType().name() + ":" + item.getCompetency())
                .collect(Collectors.toSet());

        List<MeiObligation> missing = new ArrayList<>();

        for (int month = 1; month <= 12; month++) {
            String competency = String.format("%04d-%02d", year, month);
            String key = MeiObligationType.DAS_MENSAL.name() + ":" + competency;
            if (!existingKeys.contains(key)) {
                LocalDate dueDate = YearMonth.of(year, month).plusMonths(1).atDay(20);
                missing.add(MeiObligation.builder()
                        .user(user)
                        .obligationType(MeiObligationType.DAS_MENSAL)
                        .referenceYear(year)
                        .competency(competency)
                        .dueDate(dueDate)
                        .status(dueDate.isBefore(today) ? MeiObligationStatus.OVERDUE : MeiObligationStatus.PENDING)
                        .reminderDaysBefore(reminderDays)
                        .build());
            }
        }

        String dasnCompetency = String.valueOf(year - 1);
        String dasnKey = MeiObligationType.DASN_SIMEI_ANUAL.name() + ":" + dasnCompetency;
        if (!existingKeys.contains(dasnKey)) {
            LocalDate dasnDueDate = LocalDate.of(year, 5, 31);
            missing.add(MeiObligation.builder()
                    .user(user)
                    .obligationType(MeiObligationType.DASN_SIMEI_ANUAL)
                    .referenceYear(year)
                    .competency(dasnCompetency)
                    .dueDate(dasnDueDate)
                    .status(dasnDueDate.isBefore(today) ? MeiObligationStatus.OVERDUE : MeiObligationStatus.PENDING)
                    .reminderDaysBefore(reminderDays)
                    .build());
        }

        if (!missing.isEmpty()) {
            List<MeiObligation> savedMissing = meiObligationRepository.saveAll(missing);
            existing.addAll(savedMissing);
        }

        List<MeiObligation> statusUpdates = new ArrayList<>();
        for (MeiObligation obligation : existing) {
            if (obligation.getStatus() != MeiObligationStatus.PAID_DECLARED) {
                MeiObligationStatus expectedStatus = obligation.getDueDate().isBefore(today)
                        ? MeiObligationStatus.OVERDUE
                        : MeiObligationStatus.PENDING;
                if (obligation.getStatus() != expectedStatus) {
                    obligation.setStatus(expectedStatus);
                    statusUpdates.add(obligation);
                }
            }
        }
        if (!statusUpdates.isEmpty()) {
            meiObligationRepository.saveAll(statusUpdates);
        }

        existing.sort(obligationComparator());
        return existing;
    }

    private int resolveReminderDays(UUID userId, List<MeiObligation> existing) {
        if (!existing.isEmpty() && existing.get(0).getReminderDaysBefore() != null) {
            return existing.get(0).getReminderDaysBefore();
        }
        return meiObligationRepository.findFirstByUserIdOrderByUpdatedAtDesc(userId)
                .map(MeiObligation::getReminderDaysBefore)
                .orElse(MeiObligation.DEFAULT_REMINDER_DAYS_BEFORE);
    }

    private MeiObligationScheduleResponse buildScheduleResponse(
            int year,
            List<MeiObligation> obligations,
            LocalDate today) {
        List<MeiObligationResponse> items = obligations.stream()
                .map(item -> toResponse(item, today))
                .toList();

        int reminderDays = items.isEmpty()
                ? MeiObligation.DEFAULT_REMINDER_DAYS_BEFORE
                : items.get(0).getReminderDaysBefore();

        int paidDeclaredCount = (int) items.stream()
                .filter(item -> item.getStatus() == MeiObligationStatus.PAID_DECLARED)
                .count();
        int overdueCount = (int) items.stream()
                .filter(MeiObligationResponse::isOverdue)
                .count();
        int pendingCount = (int) items.stream()
                .filter(item -> item.getStatus() == MeiObligationStatus.PENDING)
                .count();
        int dueSoonCount = (int) items.stream()
                .filter(MeiObligationResponse::isDueSoon)
                .count();

        return MeiObligationScheduleResponse.builder()
                .year(year)
                .reminderDaysBefore(reminderDays)
                .verificationSource(VERIFICATION_SOURCE)
                .regularityGuaranteed(false)
                .regularityDisclaimer(REGULARITY_DISCLAIMER)
                .totalCount(items.size())
                .paidDeclaredCount(paidDeclaredCount)
                .pendingCount(pendingCount)
                .overdueCount(overdueCount)
                .dueSoonCount(dueSoonCount)
                .officialLinks(getOfficialLinks())
                .obligations(items)
                .build();
    }

    private MeiObligationResponse toResponse(MeiObligation obligation, LocalDate today) {
        int reminderDays = obligation.getReminderDaysBefore() != null
                ? obligation.getReminderDaysBefore()
                : MeiObligation.DEFAULT_REMINDER_DAYS_BEFORE;

        boolean isPaidDeclared = obligation.getStatus() == MeiObligationStatus.PAID_DECLARED;
        long daysUntilDue = ChronoUnit.DAYS.between(today, obligation.getDueDate());
        boolean overdue = !isPaidDeclared && obligation.getDueDate().isBefore(today);
        boolean dueSoon = !isPaidDeclared && !overdue && daysUntilDue <= reminderDays;

        MeiObligationStatus effectiveStatus = isPaidDeclared
                ? MeiObligationStatus.PAID_DECLARED
                : (overdue ? MeiObligationStatus.OVERDUE : MeiObligationStatus.PENDING);

        boolean isAnnual = obligation.getObligationType() == MeiObligationType.DASN_SIMEI_ANUAL;

        return MeiObligationResponse.builder()
                .id(obligation.getId())
                .obligationType(obligation.getObligationType())
                .title(formatTitle(obligation))
                .referenceYear(obligation.getReferenceYear())
                .competency(obligation.getCompetency())
                .dueDate(obligation.getDueDate())
                .status(effectiveStatus)
                .manualReceiptCode(obligation.getManualReceiptCode())
                .paidAt(obligation.getPaidAt())
                .reminderDaysBefore(reminderDays)
                .notes(obligation.getNotes())
                .dueSoon(dueSoon)
                .overdue(overdue)
                .daysUntilDue(daysUntilDue)
                .officialUrl(isAnnual ? DASN_SIMEI_OFFICIAL_URL : PGMEI_OFFICIAL_URL)
                .officialPortalLabel(isAnnual ? "DASN-SIMEI — Receita Federal" : "PGMEI — Receita Federal")
                .verificationSource(VERIFICATION_SOURCE)
                .regularityGuaranteed(false)
                .regularityDisclaimer(REGULARITY_DISCLAIMER)
                .updatedAt(obligation.getUpdatedAt())
                .build();
    }

    private String formatTitle(MeiObligation obligation) {
        if (obligation.getObligationType() == MeiObligationType.DASN_SIMEI_ANUAL) {
            return "DASN-SIMEI — Ano-calendário " + obligation.getCompetency();
        }
        String competency = obligation.getCompetency();
        if (competency != null && competency.matches("^\\d{4}-\\d{2}$")) {
            int month = Integer.parseInt(competency.substring(5, 7));
            String year = competency.substring(0, 4);
            if (month >= 1 && month <= 12) {
                return "DAS Mensal — " + MONTH_NAMES[month - 1] + "/" + year;
            }
        }
        return "DAS Mensal — " + competency;
    }

    private Comparator<MeiObligation> obligationComparator() {
        return Comparator.comparing(MeiObligation::getDueDate)
                .thenComparing(item -> item.getObligationType().name())
                .thenComparing(MeiObligation::getCompetency);
    }

    private void validateYear(int year) {
        if (year < 2020 || year > 2100) {
            throw new InvalidRequestException("O ano de referência deve estar entre 2020 e 2100.");
        }
    }

    private String trimOrNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
