package com.linoryx.api.report.domain;

// Copy the values needed for delivery while the report transaction is still open.
public record ReportResolvedEvent(Long reportId, String customerEmail) { }
