package com.vigil.api.config;

import com.vigil.api.exception.UnauthorizedException;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.service.UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;

@Configuration
public class JwtConfig {

    @Bean
    public SecretKey jwtSecretKey(
            @Value("${security.jwt.secret}") String secret
    ) {
        return new SecretKeySpec(
                secret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        );
    }

    @Bean
    public JwtEncoder jwtEncoder(SecretKey secretKey) {
        return NimbusJwtEncoder
                .withSecretKey(secretKey)
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(SecretKey secretKey, @Lazy UserService userService) {
        NimbusJwtDecoder decoder = NimbusJwtDecoder
                .withSecretKey(secretKey)
                .macAlgorithm(MacAlgorithm.HS256)
                .build();

        OAuth2TokenValidator<Jwt> activeUserValidator = jwt -> {
            OAuth2Error error = new OAuth2Error(
                    "invalid_token", "Authentication required", null
            );
            String email = jwt.getSubject();
            if (email == null) {
                return OAuth2TokenValidatorResult.failure(error);
            }
            if (email.isBlank()) {
                return OAuth2TokenValidatorResult.failure(error);
            }

            try {
                User user = userService.getActiveUser(email);
                Object userId = jwt.getClaim("userId");
                if (!(userId instanceof Number)) {
                    return OAuth2TokenValidatorResult.failure(error);
                }

                Number tokenUserId = (Number) userId;
                if (tokenUserId.longValue() != user.getId()) {
                    return OAuth2TokenValidatorResult.failure(error);
                }

                String tokenRole = jwt.getClaimAsString("role");
                if (!user.getRole().name().equals(tokenRole)) {
                    return OAuth2TokenValidatorResult.failure(error);
                }
                return OAuth2TokenValidatorResult.success();
            } catch (UnauthorizedException exception) {
                return OAuth2TokenValidatorResult.failure(error);
            }
        };

        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer("vigil-api"),
                activeUserValidator
        ));
        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {

        JwtGrantedAuthoritiesConverter authoritiesConverter =
                new JwtGrantedAuthoritiesConverter();

        authoritiesConverter.setAuthoritiesClaimName("role");
        authoritiesConverter.setAuthorityPrefix("ROLE_");

        JwtAuthenticationConverter authenticationConverter =
                new JwtAuthenticationConverter();

        authenticationConverter.setJwtGrantedAuthoritiesConverter(
                authoritiesConverter
        );

        return authenticationConverter;
    }
}
