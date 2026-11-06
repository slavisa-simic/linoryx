package com.linoryx.api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class LinoryxApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(LinoryxApiApplication.class, args);
	}

}
