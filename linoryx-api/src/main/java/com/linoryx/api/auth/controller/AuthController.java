package com.linoryx.api.auth.controller;

import com.linoryx.api.auth.dto.AuthResponse;
import com.linoryx.api.auth.dto.LoginRequest;
import com.linoryx.api.auth.dto.RegisterRequest;
import com.linoryx.api.auth.service.AuthService;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(
        name = "Authentication",
        description = "Registration and login"
)
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService){
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public void register(
            @Valid @RequestBody RegisterRequest request
    ) {
        authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(
            @Valid @RequestBody LoginRequest request
    ){
      return authService.login(request);
    }
}
