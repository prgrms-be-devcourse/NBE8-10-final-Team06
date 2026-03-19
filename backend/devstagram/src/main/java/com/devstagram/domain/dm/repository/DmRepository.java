package com.devstagram.domain.dm.repository;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Slice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.dm.entity.Dm;

@Repository
public interface DmRepository extends JpaRepository<Dm, Long> {

    Slice<Dm> findByDmRoom_IdOrderByIdDesc(Long dmRoomId, Pageable pageable);

    Slice<Dm> findByDmRoom_IdAndIdLessThanOrderByIdDesc(Long dmRoomId, Long cursor, Pageable pageable);

    Dm findTopByDmRoom_IdOrderByIdDesc(Long roomId);

    long countByDmRoom_Id(Long roomId);

    long countByDmRoom_IdAndIdGreaterThan(Long roomId, Long lastReadId);
}
