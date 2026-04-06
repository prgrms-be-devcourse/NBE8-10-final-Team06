package com.devstagram.global.security;

import static org.springframework.security.config.http.SessionCreationPolicy.STATELESS;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomAuthenticationFilter customAuthenticationFilter;
    private final AuthRateLimitFilter authRateLimitFilter;

    @Value("${custom.cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(AbstractHttpConfigurer::disable)
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .headers(h -> h.frameOptions(HeadersConfigurer.FrameOptionsConfig::sameOrigin))
                .addFilterBefore(authRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(customAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                        // 1. OPTIONS 요청(CORS 프리플라이트)은 모두 허용
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // 2. 공통 오픈 리소스 (H2, Swagger, Actuator) 허용
                        .requestMatchers("/h2-console", "/h2-console/**")
                        .permitAll()
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**")
                        .permitAll()
                        .requestMatchers("/actuator/health")
                        .permitAll()
                        .requestMatchers("/actuator/prometheus")
                        .permitAll()
                        .requestMatchers("/actuator/metrics/**")
                        .permitAll()

                        // 3. 내 정보 조회는 반드시 인증(authenticated) 필요!
                        // /api/auth/** 보다 위에 있어야 먼저 적용됩니다.
                        .requestMatchers("/api/auth/me")
                        .authenticated()

                        // 4. 나머지 인증 관련 API(로그인, 회원가입 등)는 허용
                        .requestMatchers("/api/auth/**")
                        .permitAll()

                        // 5. 유저 조회(GET) 등은 허용
                        .requestMatchers(HttpMethod.GET, "/api/users/**")
                        .permitAll()

                        // 6. 그 외 모든 /api/** 요청은 인증 필요
                        .requestMatchers("/api/**")
                        .authenticated()

                        // 7. 위 규칙에 해당하지 않는 나머지는 모두 허용 (정적 리소스 등)
                        .anyRequest()
                        .permitAll());

        return http.build();
    }
}
