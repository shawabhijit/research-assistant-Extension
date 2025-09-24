package com.backend.service;

import com.backend.request.ResearchRequest;
import com.backend.response.GeminiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
public class ResearchService {

    @Value("${gemini.api.url}")
    private String geminiApiUrl;
    @Value("${gemini.api.key}")
    private String geminiApiKey;

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    public ResearchService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
        this.objectMapper = new ObjectMapper();
    }

    public String processContent(ResearchRequest researchRequest) {
        //Build the prompt
        String prompt = buildPrompt(researchRequest);
        //Query the AI model API
        Map<String , Object> requestBody = Map.of(
                "contents", new Object[] {
                        Map.of("parts" , new Object[] {
                                Map.of("text" , prompt)
                        })
                }
        );

        String response = webClient.post()
                .uri(geminiApiUrl + geminiApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        //parse the response return response
        return extractTextFromResponse(response);
    }

    private String extractTextFromResponse(String response) {
        try {
            GeminiResponse geminiResponse = objectMapper.readValue(response, GeminiResponse.class);
            if (!geminiResponse.getCandidates().isEmpty() && geminiResponse.getCandidates() != null) {
                GeminiResponse.Candidate firstCandidate = geminiResponse.getCandidates().getFirst();
                if (firstCandidate.getContent() != null && firstCandidate.getContent().getParts() != null
                        && !firstCandidate.getContent().getParts().isEmpty()) {
                    return firstCandidate.getContent().getParts().getFirst().getText();
                }
            }
            return "No content found is response.";
        }
        catch (Exception e) {
            return "Error Parsing : " + e.getMessage();
        }
    }

    private String buildPrompt(ResearchRequest researchRequest) {
        StringBuilder prompt = new StringBuilder();
        switch (researchRequest.getOperation()) {
            case "summarize" :
                prompt.append("Provide a clear and concise summary of the following text in a few sentence:\n\n");
                break;

            case "suggest":
                prompt.append("Based on the following content: suggest related topics and further reading. Format the response with clear headings and bullet points:\n\n");
                break;
            default:
                throw new IllegalArgumentException("Invalid operation: " + researchRequest.getOperation());
        }
        prompt.append(researchRequest.getContent());
        return prompt.toString();
    }
}
