package com.devstagram.domain.technology.controller;

import com.devstagram.domain.technology.dto.*;
import com.devstagram.domain.technology.service.TechnologyService;
import com.devstagram.global.rsdata.RsData;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/technologies")
@RequiredArgsConstructor
public class TechnologyController {
    private final TechnologyService technologyService;

    @GetMapping
    public RsData<List<TechTagRes>> getTechs() {
        List<TechTagRes> tags = technologyService.getAllTechTags();
        return RsData.success("전체 기술 태그 조회 성공", tags);
    }

    @GetMapping("/categories")
    public RsData<List<TechCategoryInfoRes>> getCategories() {

        List<TechCategoryInfoRes> categories = technologyService.getAllTechCategories();

        return RsData.success("전체 카테고리 조회 성공", categories);
    }

    @PostMapping()
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> createTech(@Valid @RequestBody TechCreateReq req) {
        technologyService.createTech(req);

        return RsData.success("기술태그 생성 성공", null);

    }

    @PostMapping("/categories")
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> createCategory(@Valid @RequestBody TechCategoryCreateReq req) {
        technologyService.createCategory(req);

        return RsData.success("카테고리 생성 성공", null);
    }

    @PutMapping("/{technologyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> updateTech(
            @Valid @RequestBody TechUpdateReq req,
            @PathVariable Long technologyId) {
        technologyService.updateTech(technologyId, req);

        return RsData.success("기술태그 수정 성공", null);

    }

    @PutMapping("/categories/{categoryId}")
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> updateCategory(
            @Valid @RequestBody TechCategoryUpdateReq req,
            @PathVariable Long categoryId) {
        technologyService.updateCategory(categoryId, req);

        return RsData.success("카테고리 수정 성공", null);

    }

    @DeleteMapping("/{technologyId}")
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> deleteTech(@PathVariable Long technologyId) {

        technologyService.deleteTech(technologyId);

        return RsData.success("기술 스택 삭제 성공", null);
    }

    @DeleteMapping("/categories/{categoryId}")
    @PreAuthorize("hasRole('ADMIN')")
    public RsData<Void> deleteCategory(@PathVariable Long categoryId) {

        technologyService.deleteCategory(categoryId);

        return RsData.success("기술 카테고리 삭제 성공", null);
    }



}
