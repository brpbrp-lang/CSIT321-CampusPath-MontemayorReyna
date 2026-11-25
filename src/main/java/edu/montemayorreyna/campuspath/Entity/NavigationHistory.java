package edu.montemayorreyna.campuspath.Entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "NavigationHistory")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class NavigationHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "navigation_id")
    private Integer navigationId;

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "location_id", referencedColumnName = "location_id")
    private Location location;

    @ManyToOne
    @JoinColumn(name = "destination_id", referencedColumnName = "location_id")
    private Location destination;

    @Column(name = "request_date")
    private LocalDate requestDate;
}
