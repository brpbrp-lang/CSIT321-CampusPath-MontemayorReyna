package edu.montemayorreyna.campuspath.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "Reports")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Report {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "report_id")
    private Integer reportId;

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "location_id", referencedColumnName = "location_id")
    private Location location;

    @Column(name = "message")
    private String message;

    @Column(name = "report_date")
    private LocalDate reportDate;

    @Column(name = "status")
    private String status;

    @ManyToOne
    @JoinColumn(name = "managed_by", referencedColumnName = "user_id")
    private User managedBy;
}
