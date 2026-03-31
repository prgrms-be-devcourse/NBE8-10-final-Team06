package com.devstagram.domain.technology.repository;

import com.devstagram.domain.technology.entity.Technology;
import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.technology.entity.TechCategory;

import java.util.List;

public interface TechCategoryRepository extends JpaRepository<TechCategory, Long> {
    List<TechCategory> findAllByOrderByNameAsc();
    List<TechCategory> findAllByIsDeletedFalseOrderByNameAsc();
}
