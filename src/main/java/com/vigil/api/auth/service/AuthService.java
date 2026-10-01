package com.vigil.api.auth.service;

import com.vigil.api.auth.dto.AuthResponse;
import com.vigil.api.auth.dto.LoginRequest;
import com.vigil.api.auth.dto.RegisterRequest;
import com.vigil.api.user.domain.User;
import com.vigil.api.user.domain.UserRole;
import com.vigil.api.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }


    public void register(RegisterRequest request){
        if(userRepository.existsByEmail(request.getEmail())){
            throw new IllegalArgumentException("Email is already registered!");
        }

        String passwordHash = passwordEncoder.encode(request.getPassword());

        User user = new User(
                request.getEmail(),
                passwordHash,
                request.getFirstName(),
                request.getLastName(),
                UserRole.USER
        );

        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request){

        User user = userRepository.
                findByEmail(request.getEmail())
                .orElseThrow(
                        () -> new IllegalArgumentException(
                                "Invalid email or password!"
                        )
                );

        if(!user.isEnabled()){
            throw new IllegalArgumentException(
                    "User account is disabled!"
            );
        }

        if(!passwordEncoder.matches(
                request.getPassword(),
                user.getPasswordHash()
        )) {
            throw new IllegalArgumentException(
                    "Invalid email or password!"
            );
        }

        String token = jwtService.generateToken(user);

        return new AuthResponse(token, "Bearer");
    }
}
