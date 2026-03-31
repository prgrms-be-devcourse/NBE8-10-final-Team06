package com.devstagram.domain.technology.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.devstagram.domain.technology.entity.Technology;

@Repository
public interface TechnologyRepository extends JpaRepository<Technology, Long> {

    /**
     * ID 리스트로 여러 기술을 한꺼번에 조회 (Post 생성/수정 시 사용)
     * JOIN FETCH를 통해 TechCategory 정보까지 한 번에 가져옵니다.
     */
    @Query("select t from Technology t join fetch t.category where t.id in :ids")
    List<Technology> findAllByIdsWithCategory(@Param("ids") List<Long> ids);

    /**
     * 기술 이름으로 단건 조회
     */
    Optional<Technology> findByName(String name);

    /**
     * 특정 카테고리에 속한 모든 기술 조회
     */
    @Query("select t from Technology t where t.category.id = :categoryId")
    List<Technology> findAllByCategoryId(@Param("categoryId") Long categoryId);

    List<Technology> findAllByOrderByNameAsc();
}
