package com.devstagram.domain.technology.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import com.devstagram.domain.technology.dto.TechCategoryUpdateReq;
import com.devstagram.domain.technology.entity.TechCategory;
import com.devstagram.domain.technology.repository.TechCategoryRepository;
import com.devstagram.global.exception.ServiceException;

@ExtendWith(MockitoExtension.class)
class TechnologyServiceTest {

    @InjectMocks
    private TechnologyService technologyService;

    @Mock
    private TechCategoryRepository techCategoryRepository;

    @Test
    @DisplayName("카테고리 삭제")
    void deleteCategory_SoftDelete_Success() {
        // given
        Long categoryId = 1L;
        TechCategory category = TechCategory.builder()
                .id(categoryId)
                .name("Backend")
                .color("#000000")
                .build();
        given(techCategoryRepository.findById(categoryId)).willReturn(Optional.of(category));

        // when
        technologyService.deleteCategory(categoryId);

        // then
        verify(techCategoryRepository, times(1)).delete(category);
    }

    @Test
    @DisplayName("이미 삭제된 카테고리를 수정하려고 하면 ServiceException이 발생")
    void updateCategory_AlreadyDeleted_Fail() {
        // given
        Long categoryId = 1L;
        TechCategory deletedCategory =
                TechCategory.builder().id(categoryId).name("Old Category").build();

        ReflectionTestUtils.setField(deletedCategory, "isDeleted", true);

        given(techCategoryRepository.findById(categoryId)).willReturn(Optional.of(deletedCategory));
        TechCategoryUpdateReq req = new TechCategoryUpdateReq("New Name", "#FFFFFF");

        // when & then
        assertThatThrownBy(() -> technologyService.updateCategory(categoryId, req))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("이미 삭제된 카테고리");
    }

    @Test
    @DisplayName("존재하지 않는 ID로 카테고리를 조회/수정/삭제 시 ServiceException이 발생한다")
    void findCategory_NotFound_Fail() {
        // given
        Long nonExistentId = 999L;
        given(techCategoryRepository.findById(nonExistentId)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> technologyService.deleteCategory(nonExistentId))
                .isInstanceOf(ServiceException.class)
                .hasMessageContaining("존재하지 않는 카테고리");
    }

    @Test
    @DisplayName("카테고리 수정 시 필드값이 정상적으로 변경되어야 한다")
    void updateCategory_Success() {
        // given
        Long categoryId = 1L;
        TechCategory category = TechCategory.builder()
                .id(categoryId)
                .name("Old Name")
                .color("#000000")
                .build();

        given(techCategoryRepository.findById(categoryId)).willReturn(Optional.of(category));
        TechCategoryUpdateReq req = new TechCategoryUpdateReq("New Name", "#FFFFFF");

        // when
        technologyService.updateCategory(categoryId, req);

        // then
        assertThat(category.getName()).isEqualTo("New Name");
        assertThat(category.getColor()).isEqualTo("#FFFFFF");
    }
}
