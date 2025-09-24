package com.backend.controller;

import com.backend.request.ResearchRequest;
import com.backend.service.ResearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/research")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ResearchController {

    private final ResearchService researchService;

    @PostMapping("/process")
    public ResponseEntity<?> prosesContent (@RequestBody ResearchRequest researchRequest) {
        String response = researchService.processContent(researchRequest);
        return ResponseEntity.ok(response);
    }

}
