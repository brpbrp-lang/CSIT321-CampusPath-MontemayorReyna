package edu.montemayorreyna.campuspath.Entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "Locations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "location_id")
    private Integer locationId;

    @Column(name = "name")
    private String name;

    @Column(name = "DESCRIPTION")
    private String description;

    @Column(name = "type")
    private String type;

    // Which building on the campus map this location belongs to (e.g. "nge", "rtl", "lrac").
    // Lets the map place pins and draw routes from data instead of guessing from the name.
    @Column(name = "map_key", length = 32)
    private String mapKey;
}