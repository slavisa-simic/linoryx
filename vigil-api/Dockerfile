FROM eclipse-temurin:25-jre-noble

WORKDIR /app

COPY target/vigil-api-0.0.1-SNAPSHOT.jar app.jar

USER 10001:10001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
