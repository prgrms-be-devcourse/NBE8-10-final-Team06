package com.devstagram.global.security;

import java.util.Collection;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

@Getter
public class SecurityUser extends User {

    private final Long id;
    private final String email;
    private final String nickname;
    private final String apiKey;

    public SecurityUser(
            Long id,
            String email,
            String nickname,
            String apiKey,
            String password,
            Collection<? extends GrantedAuthority> authorities
    ) {
        super(email, password, authorities);
        this.id = id;
        this.email = email;
        this.nickname = nickname;
        this.apiKey = apiKey;
    }
}