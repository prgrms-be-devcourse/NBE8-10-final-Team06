package com.devstagram.domain.user.dto;

import java.time.LocalDate;

import com.devstagram.domain.user.entity.Gender;
import com.devstagram.domain.user.entity.Resume;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank @Size(max = 50) String nickname,
        String githubUrl,
        @NotNull Resume resume,
        @NotNull LocalDate birthDate,
        @NotNull Gender gender) {}
