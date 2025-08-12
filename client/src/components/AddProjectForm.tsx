import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import axios from "axios";
import JSZip from "jszip"; // still used for manual mode uploads; JSON mode defers uploads to server

interface OptionItem {
  id: string;
  name: string;
}

interface CheckpointForm {
  title: string;
  requirements: string[];
  description: string;
  testFile?: File;
}

interface BoilerplateFiles {
  htmlFile?: File;
  cssFile?: File;
  jsFile?: File;
}

export default function AddProjectForm() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [technology, setTechnology] = useState<string[]>([]);
  const [concepts, setConcepts] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [requirements, setRequirements] = useState<string[]>([""]);
  const [boilerplateFiles, setBoilerplateFiles] = useState<BoilerplateFiles>(
    {}
  );
  const [projectSlug, setProjectSlug] = useState("");
  const [options, setOptions] = useState<{
    technologies: OptionItem[];
    concepts: OptionItem[];
    categories: OptionItem[];
    difficulties: OptionItem[];
  }>({ technologies: [], concepts: [], categories: [], difficulties: [] });
  const [checkpoints, setCheckpoints] = useState<CheckpointForm[]>([
    { title: "", description: "", requirements: [""] },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Mode toggle and JSON state
  const [mode, setMode] = useState<"manual" | "json">("manual");
  const [jsonText, setJsonText] = useState<string>("");
  const [parsedJson, setParsedJson] = useState<any | null>(null);
  const [jsonUploadInfo, setJsonUploadInfo] = useState<string>("");

  // Remove old json URL/file states (keeping dummy to avoid ref errors if referenced elsewhere)
  // @deprecated retained no-op states
  const [jsonBoilerplateUrl, setJsonBoilerplateUrl] = useState<string>("");

  // Helper to extract S3 key from a full URL
  const extractKeyFromUrl = (u: string): string => {
    try {
      const urlObj = new URL(u, "http://localhost");
      return urlObj.pathname.replace(/^\//, "");
    } catch {
      return u;
    }
  };

  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await axios.get("/api/project/options");
        setOptions(res.data);
      } catch (err) {
        console.error("Failed to load options", err);
      }
    }
    fetchOptions();
  }, []);

  const handleCheckpointChange = (
    index: number,
    field: keyof CheckpointForm,
    value: string | File
  ) => {
    const list = [...checkpoints];
    if (field === "testFile" && value instanceof File) {
      list[index].testFile = value;
    } else if (typeof value === "string") {
      (list[index] as any)[field] = value;
    }
    setCheckpoints(list);
  };

  const handleQuestRequirementChange = (index: number, value: string) => {
    const newRequirements = [...requirements];
    newRequirements[index] = value;
    setRequirements(newRequirements);
  };

  const addQuestRequirement = () => setRequirements([...requirements, ""]);
  const removeQuestRequirement = (index: number) =>
    setRequirements(requirements.filter((_, i) => i !== index));

  const handleCheckpointRequirementChange = (
    checkpointIndex: number,
    requirementIndex: number,
    value: string
  ) => {
    const list = [...checkpoints];
    list[checkpointIndex].requirements[requirementIndex] = value;
    setCheckpoints(list);
  };

  const addCheckpointRequirement = (checkpointIndex: number) => {
    const list = [...checkpoints];
    list[checkpointIndex].requirements.push("");
    setCheckpoints(list);
  };

  const removeCheckpointRequirement = (
    checkpointIndex: number,
    requirementIndex: number
  ) => {
    const list = [...checkpoints];
    list[checkpointIndex].requirements = list[
      checkpointIndex
    ].requirements.filter((_, i) => i !== requirementIndex);
    setCheckpoints(list);
  };

  const handleBoilerplateFileChange = (
    fileType: keyof BoilerplateFiles,
    file: File
  ) => {
    setBoilerplateFiles((prev) => ({ ...prev, [fileType]: file }));
  };

  const addCheckpoint = () =>
    setCheckpoints([
      ...checkpoints,
      { title: "", description: "", requirements: [""] },
    ]);
  const removeCheckpoint = (index: number) =>
    setCheckpoints(checkpoints.filter((_, i) => i !== index));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validation
    if (
      !title.trim() ||
      !description.trim() ||
      !technology ||
      !concepts ||
      !category ||
      !difficulty
    ) {
      setError("Please fill in all required fields.");
      setSaving(false);
      return;
    }

    if (checkpoints.length === 0) {
      setError("At least one checkpoint is required.");
      setSaving(false);
      return;
    }

    for (let i = 0; i < checkpoints.length; i++) {
      const cp = checkpoints[i];
      if (
        !cp.title.trim() ||
        cp.requirements.length === 0 ||
        cp.requirements.every((req) => !req.trim())
      ) {
        setError(
          `Checkpoint ${i + 1}: Title and at least one requirement are required.`
        );
        setSaving(false);
        return;
      }
      if (!cp.testFile) {
        setError(`Checkpoint ${i + 1}: Test file is required.`);
        setSaving(false);
        return;
      }
    }

    try {
      // Convert files to text for transmission
      const convertedBoilerplateFiles: any = {};
      if (boilerplateFiles.htmlFile) {
        convertedBoilerplateFiles.htmlFile = {
          name: boilerplateFiles.htmlFile.name,
          content: await boilerplateFiles.htmlFile.text(),
        };
      }
      if (boilerplateFiles.cssFile) {
        convertedBoilerplateFiles.cssFile = {
          name: boilerplateFiles.cssFile.name,
          content: await boilerplateFiles.cssFile.text(),
        };
      }
      if (boilerplateFiles.jsFile) {
        convertedBoilerplateFiles.jsFile = {
          name: boilerplateFiles.jsFile.name,
          content: await boilerplateFiles.jsFile.text(),
        };
      }

      const convertedCheckpoints = await Promise.all(
        checkpoints.map(async (cp) => ({
          title: cp.title.trim(),
          description: cp.description.trim(),
          requirements: cp.requirements
            .filter((req) => req.trim())
            .map((req) => req.trim()),
          testFile: cp.testFile
            ? {
                name: cp.testFile.name,
                content: await cp.testFile.text(),
              }
            : undefined,
        }))
      );

      const payload = {
        title: title.trim(),
        description: description.trim(),
        technology,
        concepts,
        category,
        difficulty,
        requirements: requirements
          .filter((req) => req.trim())
          .map((req) => req.trim()),
        boilerplateFiles: convertedBoilerplateFiles,
        checkpoints: convertedCheckpoints,
      };

      const res = await axios.post("/api/project/add", payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 200) {
        setSuccess(true);
        setTitle("");
        setProjectSlug(res.data.slug || "");
        setDescription("");
        setTechnology([]);
        setConcepts([]);
        setCategory("");
        setDifficulty("");
        setRequirements([""]);
        setBoilerplateFiles({});
        setCheckpoints([{ title: "", description: "", requirements: [""] }]);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.error || err.message || "Failed to save project"
      );
    } finally {
      setSaving(false);
    }
  };

  // JSON mode
  const tryParseJson = (text: string) => {
    try {
      const obj = JSON.parse(text || "{}");
      setParsedJson(obj);
      return obj;
    } catch {
      setParsedJson(null);
      return null;
    }
  };

  const handleSubmitJson = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setJsonUploadInfo("");

    try {
      const obj = tryParseJson(jsonText);
      if (!obj) throw new Error("Invalid JSON");
      if (!obj.title || !obj.description || !Array.isArray(obj.checkpoints)) {
        throw new Error(
          "JSON must include title, description, and checkpoints array"
        );
      }

      // Validation of boilerplate object if provided
      if (obj.boilerplate && typeof obj.boilerplate === "object") {
        const bp = obj.boilerplate;
        const hasAny = ["html", "css", "js"].some(
          (k) => bp[k] && bp[k].name && bp[k].content !== undefined
        );
        if (!hasAny) {
          throw new Error(
            "Boilerplate object provided but no valid html/css/js file objects."
          );
        }
      }

      // Normalize checkpoints (leave uploads to server)
      const finalCheckpoints = (obj.checkpoints as any[]).map((cp: any) => ({
        title: String(cp.title || "").trim(),
        description: String(cp.description || "").trim(),
        requirements: Array.isArray(cp.requirements)
          ? cp.requirements
              .map((r: any) => String(r || "").trim())
              .filter(Boolean)
          : [],
        // pass through either existing testFileUrl or inline testFile object
        ...(cp.testFileUrl
          ? { testFileUrl: cp.testFileUrl }
          : cp.testFile && cp.testFile.name && cp.testFile.content !== undefined
          ? { testFile: { name: cp.testFile.name, content: cp.testFile.content } }
          : {}),
      }));

      // Map names to canonical ids (same logic as previous manual mapping)
      const techIds = toIds(
        Array.isArray(obj.technology) ? obj.technology : [],
        options.technologies
      );
      const conceptIds = toIds(
        Array.isArray(obj.concepts) ? obj.concepts : [],
        options.concepts
      );
      const categoryId = toId(obj.category, options.categories);
      const difficultyId = toId(obj.difficulty, options.difficulties);

      // Update JSON textarea with resolved keys for user transparency
      try {
        const clone = { ...obj, checkpoints: obj.checkpoints };
        const pretty = JSON.stringify(clone, null, 2);
        setJsonText(pretty);
      } catch {
        /* ignore */
      }

      const payload = {
        title: String(obj.title || "").trim(),
        description: String(obj.description || "").trim(),
        technology: techIds,
        concepts: conceptIds,
        category: categoryId,
        difficulty: difficultyId,
        requirements: Array.isArray(obj.requirements)
          ? obj.requirements.map((r: any) => String(r || "").trim()).filter(Boolean)
          : [],
        // Prefer explicit boilerplateUrl, else provide boilerplate object for server-side zip/upload
        ...(obj.boilerplateUrl
          ? { boilerplateUrl: obj.boilerplateUrl }
          : obj.boilerplate
          ? { boilerplate: obj.boilerplate }
          : {}),
        checkpoints: finalCheckpoints,
      };

      const res = await axios.post("/api/project/add", payload, {
        headers: { "Content-Type": "application/json" },
      });

      if (res.status === 200) {
        setSuccess(true);
        setProjectSlug(res.data.slug || "");
        setJsonUploadInfo("Uploaded boilerplate & test files, project created.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  // Helper: map JSON names/ids to canonical option ids
  const toIds = (values: any[], optionsList: OptionItem[]): string[] => {
    const out: string[] = [];
    const lowerNameMap = new Map(optionsList.map(o => [o.name.toLowerCase(), o.id] as const));
    const idSet = new Set(optionsList.map(o => o.id));
    for (const v of values || []) {
      const s = String(v ?? '').trim();
      if (!s) continue;
      if (idSet.has(s)) { out.push(s); continue; }
      const id = lowerNameMap.get(s.toLowerCase());
      if (id) out.push(id);
    }
    // dedupe
    return Array.from(new Set(out));
  };
  const toId = (value: any, optionsList: OptionItem[]): string => {
    const s = String(value ?? '').trim();
    if (!s) return '';
    const byId = optionsList.find(o => o.id === s)?.id;
    if (byId) return byId;
    const byName = optionsList.find(o => o.name.toLowerCase() === s.toLowerCase())?.id;
    return byName || '';
  };

  return (
    <div className="min-h-screen p-6 relative">
      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl border border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h2 className="text-xl font-semibold text-white">Uploading Project...</h2>
            <p className="text-gray-400 text-center">Uploading files and creating project</p>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-wrap gap-2 items-center">
        <span className="text-gray-400 mr-2">Mode:</span>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-4 py-2 rounded-lg border ${mode === "manual" ? "bg-blue-600 text-white border-blue-500" : "bg-gray-800 text-gray-300 border-gray-700"}`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setMode("json")}
          className={`px-4 py-2 rounded-lg border ${mode === "json" ? "bg-blue-600 text-white border-blue-500" : "bg-gray-800 text-gray-300 border-gray-700"}`}
        >
          JSON Import
        </button>
      </div>

      {mode === "json" ? (
        <form onSubmit={handleSubmitJson} className="max-w-6xl mx-auto space-y-6 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-semibold text-white">JSON Project Import</h1>
            <p className="text-gray-400 text-sm mt-1">Paste full metadata plus inline boilerplate & test file content. We upload & convert automatically.</p>
          </div>
          {error && <div className="bg-red-900/50 border border-red-700 text-red-200 p-3 rounded">{error}</div>}
          {success && <div className="bg-green-900/40 border border-green-700 text-green-200 p-3 rounded">Success. Slug: <span className="font-mono">{projectSlug}</span></div>}
          {jsonUploadInfo && <div className="bg-blue-900/40 border border-blue-700 text-blue-200 p-2 rounded text-sm">{jsonUploadInfo}</div>}

          <textarea
            value={jsonText}
            onChange={(e) => { setJsonText(e.target.value); tryParseJson(e.target.value); }}
            className="w-full bg-gray-900 border border-gray-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-[420px] font-mono text-sm"
            placeholder={`{
  "title": "My Project",
  "description": "...",
  "technology": ["HTML","CSS","JavaScript"],
  "concepts": ["Loops"],
  "category": "Web Development",
  "difficulty": "Intermediate",
  "requirements": ["Requirement A"],
  "boilerplate": {
    "html": { "name": "index.html", "content": "<html>...</html>" },
    "css":  { "name": "styles.css", "content": "body { }" },
    "js":   { "name": "script.js", "content": "console.log('hi')" }
  },
  "checkpoints": [
    {
      "title": "Checkpoint 1",
      "description": "...",
      "requirements": ["..."],
      "testFile": { "name": "cp1.test.js", "content": "export function test(){return {passed:true,message:'ok'}}" }
    }
  ]
}`}
          />
          <div className="flex flex-wrap gap-3 items-center">
            <input type="file" accept="application/json,.json" className="text-gray-300" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const t = await f.text(); setJsonText(t); tryParseJson(t); }} />
            <button type="button" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={() => {
              const sample = {
                title: 'Sample Project',
                description: 'Demo project imported via JSON',
                technology: ['HTML','CSS','JavaScript'],
                concepts: ['DOM'],
                category: 'Web Development',
                difficulty: 'Beginner',
                requirements: ['Have a heading', 'Show a list'],
                boilerplate: {
                  html: { name: 'index.html', content: '<!DOCTYPE html><html><head><title>Sample</title></head><body><h1 id="app-title">Sample</h1></body></html>' },
                  css:  { name: 'styles.css', content: 'body { font-family: sans-serif; }' },
                  js:   { name: 'script.js', content: 'console.log("Loaded")' }
                },
                checkpoints: [
                  { title: 'Has heading', description: 'Check for a heading element', requirements: ['#app-title exists'], testFile: { name: 'cp1.test.js', content: 'export function test(){const el=document.getElementById("app-title");return {passed:!!el,message:el?"Heading found":"Heading missing"};}' } }
                ]
              };
              const pretty = JSON.stringify(sample, null, 2); setJsonText(pretty); tryParseJson(pretty);
            }}>Load sample</button>
            {parsedJson && <span className="text-green-400 text-sm">Parsed ✓ {Array.isArray(parsedJson?.checkpoints) ? parsedJson.checkpoints.length : 0} checkpoints</span>}
          </div>
          <div className="bg-gray-900 border border-gray-700 rounded p-4 text-sm text-gray-300 space-y-2">
            <p className="font-semibold text-white">Schema Notes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Inline code goes under boilerplate.html/css/js and checkpoints[].testFile.</li>
              <li>Each file object requires name and content.</li>
              <li>We upload & replace them with S3 keys automatically (not altering your original JSON except adding *Url fields).</li>
              <li>technology/concepts can be names or existing IDs.</li>
            </ul>
          </div>
          <div className="flex justify-center">
            <button type="submit" disabled={saving} className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium min-w-[160px]">
              {saving ? 'Processing...' : 'Import Project'}
            </button>
          </div>
        </form>
      ) : (
        // Manual form (unchanged core behavior)
        <form onSubmit={handleSubmit} className="max-w-6xl mx-auto space-y-6 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Add New Project</h1>
            <p className="text-gray-400">Create a new project with checkpoints and test files</p>
          </div>

          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg flex items-center justify-between">
              <div>
                <p>
                  Project added successfully! Here's your slug: <span className="font-semibold">{projectSlug}</span>
                </p>
                <a href={`/projects/${projectSlug}`} className="text-blue-400 hover:underline">View Project</a>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(projectSlug)}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                type="button"
              >
                Copy Slug
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 font-medium mb-2">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter project title"
              />
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Technology</label>
              <div className="flex flex-wrap gap-2">
                {options.technologies.map((o) => (
                  <label key={o.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:border-transparent transition-all"
                      value={o.id}
                      checked={technology.includes(o.id)}
                      onChange={(e) => {
                        const techId = o.id;
                        if (e.target.checked) setTechnology([...technology, techId]);
                        else setTechnology(technology.filter((id) => id !== techId));
                      }}
                    />
                    <span className="ml-2 text-gray-300">{o.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Concepts</label>
              <div className="flex flex-wrap gap-2">
                {options.concepts.map((o) => (
                  <label key={o.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:border-transparent transition-all"
                      value={o.id}
                      checked={concepts.includes(o.id)}
                      onChange={(e) => {
                        const id = o.id;
                        if (e.target.checked) setConcepts([...concepts, id]);
                        else setConcepts(concepts.filter((x) => x !== id));
                      }}
                    />
                    <span className="ml-2 text-gray-300">{o.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-gray-300 font-medium mb-2">Category</label>
              <select
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select Category</option>
                {options.categories.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-gray-300 font-medium mb-2">Difficulty</label>
              <select
                required
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select Difficulty</option>
                {options.difficulties.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-2">Description</label>
            <textarea
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-32 resize-none"
              placeholder="Enter project description..."
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-gray-300 font-medium">Quest Requirements</label>
              <button type="button" onClick={addQuestRequirement} className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-all">+ Add Requirement</button>
            </div>
            <div className="space-y-2">
              {requirements.map((req, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={req}
                    onChange={(e) => handleQuestRequirementChange(idx, e.target.value)}
                    className="flex-1 bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter a quest requirement..."
                  />
                  {requirements.length > 1 && (
                    <button type="button" onClick={() => removeQuestRequirement(idx)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all">×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <h2 className="text-2xl font-semibold text-white mb-4">Boilerplate Files</h2>
            <p className="text-gray-400 mb-2">Upload your HTML, CSS, and JS files. They will be zipped together as boilerplate code.</p>
            <p className="text-gray-400 text-sm mb-6">Exactly three files: one HTML, one CSS, and one JS.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <label className="block text-gray-300 font-medium mb-2">HTML File</label>
                <input
                  type="file"
                  accept=".html,.htm"
                  onChange={(e) =>
                    e.target.files &&
                    handleBoilerplateFileChange("htmlFile", e.target.files[0])
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                />
                {boilerplateFiles.htmlFile && (
                  <p className="text-green-400 text-sm mt-2">
                    ✓ {boilerplateFiles.htmlFile.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">CSS File</label>
                <input
                  type="file"
                  accept=".css"
                  onChange={(e) =>
                    e.target.files &&
                    handleBoilerplateFileChange("cssFile", e.target.files[0])
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                />
                {boilerplateFiles.cssFile && (
                  <p className="text-green-400 text-sm mt-2">
                    ✓ {boilerplateFiles.cssFile.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-gray-300 font-medium mb-2">JavaScript File</label>
                <input
                  type="file"
                  accept=".js"
                  onChange={(e) =>
                    e.target.files &&
                    handleBoilerplateFileChange("jsFile", e.target.files[0])
                  }
                  className="w-full bg-gray-700 border border-gray-600 text-gray-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                />
                {boilerplateFiles.jsFile && (
                  <p className="text-green-400 text-sm mt-2">
                    ✓ {boilerplateFiles.jsFile.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Checkpoints</h2>
              <button
                type="button"
                onClick={addCheckpoint}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium transition-all transform hover:scale-105"
              >
                + Add Checkpoint
              </button>
            </div>

            <div className="space-y-4">
              {checkpoints.map((cp, idx) => (
                <div
                  key={idx}
                  className="bg-gray-700/50 border border-gray-600 p-6 rounded-lg"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-white">
                      Checkpoint {idx + 1}
                    </h3>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => removeCheckpoint(idx)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Title
                      </label>
                      <input
                        required
                        value={cp.title}
                        onChange={(e) =>
                          handleCheckpointChange(idx, "title", e.target.value)
                        }
                        className="w-full bg-gray-600 border border-gray-500 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        placeholder="Enter checkpoint title"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Description
                      </label>
                      <textarea
                        required
                        value={cp.description}
                        onChange={(e) =>
                          handleCheckpointChange(
                            idx,
                            "description",
                            e.target.value
                          )
                        }
                        className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all h-32 resize-none"
                        placeholder="Enter project description..."
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-gray-300 font-medium">
                          Requirements
                        </label>
                        <button
                          type="button"
                          onClick={() => addCheckpointRequirement(idx)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-all"
                        >
                          + Add
                        </button>
                      </div>
                      <div className="space-y-2">
                        {cp.requirements.map((req, reqIdx) => (
                          <div key={reqIdx} className="flex gap-2">
                            <input
                              required={reqIdx === 0}
                              value={req}
                              onChange={(e) =>
                                handleCheckpointRequirementChange(idx, reqIdx, e.target.value)
                              }
                              className="flex-1 bg-gray-600 border border-gray-500 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                              placeholder={
                                reqIdx === 0
                                  ? "Primary requirement (required)"
                                  : "Additional requirement"
                              }
                            />
                            {cp.requirements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeCheckpointRequirement(idx, reqIdx)}
                                className="px-2 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all text-sm"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-gray-400 text-sm mt-2">
                        Hint: Use element IDs or classes, e.g.,{" "}
                        <code className="bg-gray-600 px-1 rounded">
                          id="app-title"
                        </code>{" "}
                        or{" "}
                        <code className="bg-gray-600 px-1 rounded">
                          .btn-submit
                        </code>
                      </p>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-medium mb-2">
                        Test File (.js)
                      </label>
                      <input
                        type="file"
                        accept=".js"
                        onChange={(e) =>
                          e.target.files &&
                          handleCheckpointChange(idx, "testFile", e.target.files[0])
                        }
                        className="w-full bg-gray-600 border border-gray-500 text-gray-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                      />
                      <p className="text-gray-400 text-sm mt-2">
                        Test files must export functions that return{" "}
                        {`{ passed: boolean, message: string }`}.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 text-white rounded-lg font-medium transition-all transform hover:scale-105 disabled:scale-100 min-w-[160px]"
            >
              {saving ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                "Submit Project"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
