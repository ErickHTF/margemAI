package com.example.margemAI.security.service;

import com.example.margemAI.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.access-token-expiration:3600}")
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token-expiration:604800}")
    private long refreshTokenExpiration;

    private SecretKey getSigningKey() {
        byte[] keyBytes = this.secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", user.getId().toString());
        claims.put("email", user.getEmail());
        claims.put("name", user.getName());
        claims.put("cnpj", user.getCnpj());
        claims.put("segment", user.getSegment() != null ? user.getSegment().getCode() : "");
        claims.put("type", "ACCESS");

        return buildToken(user.getId(), claims, accessTokenExpiration);
    }

    public String generateRefreshToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("type", "REFRESH");

        return buildToken(user.getId(), claims, refreshTokenExpiration);
    }

    private String buildToken(UUID subject, Map<String, Object> claims, long expirationSeconds) {
        return Jwts.builder()
                .claims(claims)
                .subject(subject.toString())
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + (expirationSeconds * 1000)))
                .signWith(getSigningKey())
                .compact();
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public UUID extractUserId(String token) {
        return UUID.fromString(extractAllClaims(token).getSubject());
    }

    public boolean isAccessTokenValid(String token) {
        return isValidToken(token, "ACCESS");
    }

    public boolean isRefreshTokenValid(String token) {
        return isValidToken(token, "REFRESH");
    }

    private boolean isValidToken(String token, String expectedType) {
        try {
            Claims claims = extractAllClaims(token);
            return expectedType.equals(claims.get("type", String.class))
                    && claims.getExpiration().after(new Date());
        } catch (RuntimeException ex) {
            return false;
        }
    }
}
