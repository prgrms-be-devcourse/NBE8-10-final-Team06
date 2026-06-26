package com.devstagram.domain.user.entity;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;
import org.springframework.data.elasticsearch.annotations.Setting;

@Getter
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "users")
@Setting(settingPath = "elastic/user-settings.json")
public class UserDocument {

    @Id
    private Long id;

    @Field(type = FieldType.Text, analyzer = "edge_ngram_analyzer")
    private String nickname;

    @Field(type = FieldType.Keyword)
    private String profileImageUrl;

    @Field(type = FieldType.Boolean)
    private boolean isDeleted;
}