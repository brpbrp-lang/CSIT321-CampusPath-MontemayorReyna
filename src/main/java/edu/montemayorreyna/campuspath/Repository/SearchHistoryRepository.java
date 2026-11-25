package edu.montemayorreyna.campuspath.Repository;

import edu.montemayorreyna.campuspath.Entity.SearchHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Integer> {
    List<SearchHistory> findByUser_UserId(Integer userId);
}
