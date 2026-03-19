package com.devstagram.domain.dm.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.dm.entity.DmRoomUser;

@Repository
public interface DmRoomUserRepository extends JpaRepository<DmRoomUser, Long> {

    boolean existsByDmRoom_IdAndUser_Id(Long dmRoomId, Long userId);

    List<DmRoomUser> findByUser_Id(Long userId);

    List<DmRoomUser> findByDmRoom_Id(Long roomId);

    List<DmRoomUser> findByDmRoom_IdIn(Collection<Long> roomIds);

    @Query("select ru from DmRoomUser ru join fetch ru.user where ru.dmRoom.id in :roomIds")
    List<DmRoomUser> findParticipantsByDmRoom_IdIn(@Param("roomIds") Collection<Long> roomIds);

    Optional<DmRoomUser> findByDmRoom_IdAndUser_Id(Long roomId, Long userId);

    long countByDmRoom_Id(Long roomId);

    /**
     * 1:1 채팅방 후보를 "한 번의 쿼리"로 찾습니다.
     * - room.isGroup = false
     * - 해당 room에 두 유저가 모두 참여
     * - participants(DmRoomUser) 수 = 2 (즉, 정확히 1:1)
     */
    @Query("""
            select r.id
            from DmRoom r
            join DmRoomUser ru on ru.dmRoom.id = r.id
            where r.isGroup = false
            group by r.id
            having sum(case when ru.user.id = :userA then 1 else 0 end) = 1
               and sum(case when ru.user.id = :userB then 1 else 0 end) = 1
               and count(ru) = 2
            """)
    Optional<Long> find1v1RoomId(@Param("userA") Long userA, @Param("userB") Long userB);
}
