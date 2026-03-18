package com.devstagram.domain.dm.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.dm.entity.DmRoomUser;

@Repository
public interface DmRoomUserRepository extends JpaRepository<DmRoomUser, Long> {

    boolean existsByDmRoom_IdAndUser_Id(Long dmRoomId, Long userId);

    List<DmRoomUser> findByUser_Id(Long userId);

    List<DmRoomUser> findByDmRoom_Id(Long roomId);
}
