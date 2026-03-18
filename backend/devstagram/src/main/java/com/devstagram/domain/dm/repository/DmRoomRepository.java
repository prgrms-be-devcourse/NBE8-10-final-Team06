package com.devstagram.domain.dm.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.dm.entity.DmRoom;

@Repository
public interface DmRoomRepository extends JpaRepository<DmRoom, Long> {}
