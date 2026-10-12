package com.example.margemAI.model;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name = "account_movements")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AccountMovement {
    public enum Type { APORTE, RETIRADA, PRO_LABORE, TRANSFERENCIA }
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private BusinessAccount account;
    @ManyToOne(fetch = FetchType.LAZY) private BusinessAccount destination;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private Type type;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Column(nullable = false) private LocalDate date;
    @Column(nullable = false, length = 200) private String description;
}
