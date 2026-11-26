package edu.montemayorreyna.campuspath.Repository;

import edu.montemayorreyna.campuspath.Entity.NavigationHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NavigationHistoryRepository extends JpaRepository<NavigationHistory, Integer> {
    List<NavigationHistory> findByUser_UserIdOrderByNavigationIdDesc(Integer userId);
}
