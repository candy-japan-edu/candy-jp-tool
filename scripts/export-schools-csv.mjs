import { readFile, writeFile } from "node:fs/promises";

const headers = [
  "id",
  "school_name_cn",
  "school_name_jp",
  "school_type",
  "tier",
  "region",
  "direction",
  "faculty",
  "major",
  "major_category",
  "subject_tags",
  "application_window_start",
  "application_window_end",
  "exam_date",
  "result_date",
  "exam_form",
  "required_documents",
  "candy_review",
  "eju_subjects_required",
  "eju_japanese_min",
  "english_required",
  "english_min",
  "exam_subjects",
  "exam_description",
  "exam_tips",
  "candy_tags",
  "candy_rating",
  "official_url",
  "logo",
  "other_requirements",
  "updated_at"
];

function csvValue(value) {
  const text = Array.isArray(value) ? value.join(",") : String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

const schools = JSON.parse(await readFile(new URL("../data/schools.json", import.meta.url), "utf8"));
const rows = [headers.join(","), ...schools.map((school) => headers.map((header) => csvValue(school[header])).join(","))];

await writeFile(new URL("../data/schools-sample.csv", import.meta.url), `${rows.join("\n")}\n`);
console.log(`Exported ${schools.length} rows to data/schools-sample.csv`);
