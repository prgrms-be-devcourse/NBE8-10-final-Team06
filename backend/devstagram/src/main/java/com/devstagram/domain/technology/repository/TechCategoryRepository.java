package com.devstagram.domain.technology.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.devstagram.domain.technology.entity.TechCategory;

public interface TechCategoryRepository extends JpaRepository<TechCategory, Long> {}
