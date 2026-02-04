FROM gradle:8.14.3-jdk21 AS build

WORKDIR /workspace
COPY . .

# Build a runnable jar using the project's Gradle wrapper (reproducible).
RUN chmod +x ./gradlew && ./gradlew --no-daemon clean bootJar

FROM eclipse-temurin:21-jre

WORKDIR /app
# Copy the Spring Boot "bootJar" (fat jar). Avoid the "-plain.jar" artifact.
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
