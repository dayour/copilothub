---
sidebar_position: 3
title: Headless Data Scrape Report
---

# Headless Data Scrape Report

Scrapes product pricing data across multiple competitor sites and emits a comparison report.

- **File:** `sample-runbooks/data-scrape-report.yaml`
- **Visibility:** `personal`
- **Tags:** `automation`, `scraping`, `reporting`

## Variables

| Name | Source | Description |
| --- | --- | --- |
| `target_urls` | prompt | Comma-separated URLs to scrape |
| `output_dir` | literal (`~/CopilotOS/Reports`) | Output directory for reports |

## What it shows

- Sequential `browser.navigate` calls against a set of URLs.
- Headless sidecar mode for unattended execution.
- Report generation step that writes structured output to disk.

## When to use

A starting point for any workflow that visits several URLs, extracts content, and aggregates the results. Use the `output_dir` variable to direct the report to a stable location for downstream tooling.
