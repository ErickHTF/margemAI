# Multi-stage Dockerfile para o Backend Spring Boot (MargemAI)
# Stage 1: Build da aplicação com Maven e OpenJDK 21
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Cache de dependências Maven
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compilação do pacote executável
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Imagem de execução enxuta com JRE 21 Alpine (~150MB)
FROM eclipse-temurin:21-jre-alpine AS runner

WORKDIR /app

# Usuário de sistema sem privilégios administrativos
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Cópia do artefato compilado
COPY --from=builder /build/target/*.jar app.jar
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-Dspring.profiles.active=default", "-jar", "app.jar"]
