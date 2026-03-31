package com.devstagram.domain.technology.service;

import com.devstagram.domain.technology.dto.*;
import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.entity.Technology;
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.domain.technology.repository.TechnologyRepository;
import com.devstagram.global.exception.ServiceException;
import jakarta.persistence.EntityNotFoundException;
import jdk.jfr.Category;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class TechnologyService {
    private final TechnologyRepository technologyRepository;
    private final TechCategoryRepository techCategoryRepository;

    public List<TechTagRes> getAllTechTags() {
        List<Technology> technologyList = technologyRepository.findAllByOrderByNameAsc();

        return technologyList.stream()
                .map(TechTagRes::from)
                .toList();
    }

    public List<TechCategoryInfoRes> getAllTechCategories() {

        List<TechCategory> categoryList = techCategoryRepository.findAllByIsDeletedFalseOrderByNameAsc();

        return categoryList.stream()
                .map(TechCategoryInfoRes::from)
                .toList();
    }

    @Transactional
    public void createTech(TechCreateReq req){

        TechCategory category = techCategoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ServiceException("404-C-1","카테고리를 찾을 수 없습니다."));

        Technology technology = Technology.builder()
                .category(category)
                .name(req.name())
                .color(req.color())
                .iconUrl(req.iconUrl())
                .build();

        technologyRepository.save(technology);
    }

    @Transactional
    public void createCategory(TechCategoryCreateReq req){
        TechCategory techCategory = TechCategory.builder()
                .name(req.name())
                .color(req.color())
                .build();

        techCategoryRepository.save(techCategory);
    }

    @Transactional
    public void updateTech(Long techId, TechUpdateReq req) {
        Technology technology = technologyRepository.findById(techId)
                .orElseThrow(() -> new ServiceException("404-T-1","존재하지 않는 기술 스택입니다."));

        TechCategory category = techCategoryRepository.findById(req.categoryId())
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 카테고리입니다."));

        technology.update(
                category,
                req.name(),
                req.iconUrl(),
                req.color()
        );
    }

    @Transactional
    public void updateCategory(Long categoryId, TechCategoryUpdateReq req) {

        TechCategory category = techCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 카테고리입니다."));

        if (category.isDeleted()) {
            throw new ServiceException("404-C-2", "이미 삭제된 카테고리는 수정할 수 없습니다.");
        }

        category.update(
                req.name(),
                req.color()
        );
    }

    @Transactional
    public void deleteTech(Long techId) {
        Technology technology = technologyRepository.findById(techId)
                .orElseThrow(() -> new ServiceException("404-T-1", "존재하지 않는 기술 스택입니다."));

        technologyRepository.delete(technology);
    }

    @Transactional
    public void deleteCategory(Long categoryId) {
        TechCategory category = techCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ServiceException("404-C-1", "존재하지 않는 카테고리입니다."));

        category.softDelete();
    }

}
