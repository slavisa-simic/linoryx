package com.vigil.api.network.domain;

public enum NodeType {
    GPON_OLT("OLT"),
    ROUTER("RTR"),
    SWITCH("SW"),
    WIRELESS_BASE_STATION("WBS");

    private final String abbreviation;

    NodeType(String abbreviation) {
        this.abbreviation = abbreviation;
    }

    public String getAbbreviation() {
        return abbreviation;
    }
}
