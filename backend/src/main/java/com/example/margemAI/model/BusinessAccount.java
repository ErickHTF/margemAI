package com.example.margemAI.model;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
@Entity @Table(name = "business_accounts")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class BusinessAccount {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false, length = 100) private String name;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal openingBalance;
    @Column(nullable = false) private LocalDate openingDate;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(nullable = false) private User user;
}
