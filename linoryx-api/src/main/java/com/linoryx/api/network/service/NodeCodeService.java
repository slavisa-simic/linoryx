package com.linoryx.api.network.service;

import com.linoryx.api.network.domain.NodeType;
import com.linoryx.api.network.repository.NodeCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.text.Normalizer;
import java.util.Locale;

@Service
public class NodeCodeService {
    private final NodeCodeRepository repository;

    public NodeCodeService(NodeCodeRepository repository) {
        this.repository = repository;
    }

    // Commit the reservation even if saving the node later fails. Codes are never recycled.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String generate(String city, NodeType nodeType) {
        String prefix = cityCode(city) + "-" + nodeType.getAbbreviation();
        long number = repository.nextNumber(prefix);
        return prefix + "-" + String.format(Locale.ROOT, "%03d", number);
    }

    public String cityCode(String city) {
        String ascii = Normalizer.normalize(city, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").toUpperCase(Locale.ROOT)
                .replace("Đ", "DJ").replace("Ł", "L").replace("Æ", "AE").replace("Ø", "O")
                .replaceAll("[^A-Z0-9]", "");
        if (ascii.isEmpty()) {
            throw new IllegalArgumentException("This city needs a Latin-script geocoding result to generate a node code.");
        }
        return ascii;
    }
}
