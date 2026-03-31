package com.devstagram.domain.dm.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.dm.entity.Dm;

@Repository
public interface DmRepository extends JpaRepository<Dm, Long> {

    /** sender 는 LAZY — 페이징 조회 시 함께 로드하지 않으면 행마다 다른 발신자 id 가 무력화되는 환경이 있어 EntityGraph 로 고정 */
    @EntityGraph(attributePaths = {"sender"})
    Slice<Dm> findByDmRoom_IdOrderByIdDesc(Long dmRoomId, Pageable pageable);

    @EntityGraph(attributePaths = {"sender"})
    Slice<Dm> findByDmRoom_IdAndIdLessThanOrderByIdDesc(Long dmRoomId, Long cursor, Pageable pageable);

    Dm findTopByDmRoom_IdOrderByIdDesc(Long roomId);

    /**
     * 각 dmRoom 별 최신 메시지 1개를 배치로 조회합니다.
     * (dmRoom.id IN + correlated subquery로 max(d2.id) 선택)
     */
    @Query("""
            select d from Dm d
            where d.dmRoom.id in :roomIds
              and d.id = (
                select max(d2.id) from Dm d2 where d2.dmRoom.id = d.dmRoom.id
              )
            """)
    List<Dm> findLatestByDmRoom_IdIn(@Param("roomIds") Collection<Long> roomIds);

    @Query("""
            select d.dmRoom.id, count(d)
            from Dm d
            where d.dmRoom.id in :roomIds
            group by d.dmRoom.id
            """)
    List<Object[]> countTotalByDmRoom_IdIn(@Param("roomIds") Collection<Long> roomIds);

    long countByDmRoom_Id(Long roomId);

    long countByDmRoom_IdAndIdGreaterThan(Long roomId, Long lastReadId);

    // 채팅방 삭제 시, 해당 채팅방의 모든 메시지를 일괄 삭제
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM Dm d WHERE d.dmRoom.id = :roomId")
    void deleteByDmRoom_Id(@Param("roomId") Long roomId);
}
