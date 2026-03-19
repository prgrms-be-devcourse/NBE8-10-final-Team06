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
}
