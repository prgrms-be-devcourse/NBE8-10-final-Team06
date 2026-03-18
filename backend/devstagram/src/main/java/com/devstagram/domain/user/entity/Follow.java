package com.devstagram.domain.user.entity;

import com.devstagram.global.entity.BaseEntity;
import com.devstagram.global.exception.ServiceException;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
@Table(
        name = "follow",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_follow_from_to",
                        columnNames = {"from_user_id", "to_user_id"} // 1. 중복 팔로우 DB 단에서 원천 차단
                )
        }
)
public class Follow extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_user_id", nullable = false)
    private User fromUser; // 팔로우 주체 (나)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_user_id", nullable = false)
    private User toUser;   // 팔로우 대상 (상대방)

    @PrePersist
    public void validate() {
        if (fromUser.getId().equals(toUser.getId())) {
            throw new ServiceException("400-F-1", "자기 자신을 팔로우할 수 없습니다.");
        }
    }
}