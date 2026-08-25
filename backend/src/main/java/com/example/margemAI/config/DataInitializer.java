package com.example.margemAI.config;

import com.example.margemAI.model.Segment;
import com.example.margemAI.repository.SegmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final SegmentRepository segmentRepository;

    @Override
    public void run(String... args) {
        if (segmentRepository.count() == 0) {
            List<Segment> defaultSegments = List.of(
                Segment.builder().code("COMERCIO").name("Comércio Varejista e Atacadista").description("Venda de mercadorias, lojas e comércio geral").active(true).build(),
                Segment.builder().code("SERVICOS").name("Prestação de Serviços").description("Serviços em geral, consultorias e reparos").active(true).build(),
                Segment.builder().code("INDUSTRIA").name("Pequena Indústria e Manufatura").description("Produção e transformação de produtos artesanais/industriais").active(true).build(),
                Segment.builder().code("ALIMENTACAO").name("Alimentação e Gastronomia").description("Restaurantes, lanchonetes, marmitas e doces").active(true).build(),
                Segment.builder().code("BELEZA").name("Beleza e Estética").description("Salões, barbearias, manicures e cosméticos").active(true).build(),
                Segment.builder().code("VESTUARIO").name("Vestuário e Moda").description("Confecção, roupas, calçados e acessórios").active(true).build(),
                Segment.builder().code("TECNOLOGIA").name("Tecnologia da Informação").description("Desenvolvimento de software, suporte e marketing digital").active(true).build(),
                Segment.builder().code("AUTOMOTIVO").name("Serviços Automotivos").description("Oficinas mecânicas, lava-rápido e autopeças").active(true).build(),
                Segment.builder().code("CONSTRUCAO").name("Construção Civil e Reformas").description("Pedreiros, eletricistas, encanadores e pintura").active(true).build(),
                Segment.builder().code("OUTRO").name("Outros Segmentos").description("Demais atividades enquadradas no MEI").active(true).build()
            );

            segmentRepository.saveAll(defaultSegments);
        }
    }
}
