package edu.montemayorreyna.campuspath.Entity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Entity
@Table(name = "SearchHistory")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SearchHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "searchId")
    private Integer searchId;

    @ManyToOne
    @JoinColumn(name = "userID", referencedColumnName = "user_id")
    private User user;

    @Column(name = "keyword")
    private String keyword;

    @Column(name = "search_date")
    private LocalDate searchDate;
}
