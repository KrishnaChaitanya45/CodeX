import React, { useState, useEffect, ChangeEvent, FormEvent } from "react";
import axios from "axios";

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
      // Convert files to base64 for transmission
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

  return (
    <div className="min-h-screen p-6 relative">
      {/* Loading Overlay */}
      {saving && (
        <div className="fixed inset-0 backdrop-blur-md bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4 shadow-xl border border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            <h2 className="text-xl font-semibold text-white">
              Uploading Project...
            </h2>
            <p className="text-gray-400 text-center">
              Uploading files and creating project
            </p>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-6xl mx-auto space-y-6 bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Add New Project
          </h1>
          <p className="text-gray-400">
            Create a new project with checkpoints and test files
          </p>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-900/50 border border-green-700 text-green-200 p-4 rounded-lg flex items-center justify-between">
            <div>
              <p>
            Project added successfully! Here's your slug:{" "}
            <span className="font-semibold">{projectSlug}</span>
              </p>
              <a
            href={`/projects/${projectSlug}`}
            className="text-blue-400 hover:underline"
              >
            View Project
              </a>
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
            <label className="block text-gray-300 font-medium mb-2">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter project title"
            />
          </div>
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Technology
            </label>
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
                      if (e.target.checked) {
                        setTechnology([...technology, techId]);
                      } else {
                        setTechnology(technology.filter((id) => id !== techId));
                      }
                    }}
                  />
                  <span className="ml-2 text-gray-300">{o.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Concepts
            </label>
            <div className="flex flex-wrap gap-2">
              {options.concepts.map((o) => (
                <label key={o.id} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox h-5 w-5 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:border-transparent transition-all"
                    value={o.id}
                    checked={concepts.includes(o.id)}
                    onChange={(e) => {
                      const conceptId = o.id;
                      if (e.target.checked) {
                        setConcepts([...concepts, conceptId]);
                      } else {
                        setConcepts(concepts.filter((id) => id !== conceptId));
                      }
                    }}
                  />
                  <span className="ml-2 text-gray-300">{o.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-300 font-medium mb-2">
              Category
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select Category</option>
              {options.categories.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-gray-300 font-medium mb-2">
              Difficulty
            </label>
            <select
              required
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">Select Difficulty</option>
              {options.difficulties.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-gray-300 font-medium mb-2">
            Description
          </label>
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
            <label className="block text-gray-300 font-medium">
              Quest Requirements
            </label>
            <button
              type="button"
              onClick={addQuestRequirement}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-all"
            >
              + Add Requirement
            </button>
          </div>
          <div className="space-y-2">
            {requirements.map((req, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={req}
                  onChange={(e) =>
                    handleQuestRequirementChange(idx, e.target.value)
                  }
                  className="flex-1 bg-gray-700 border border-gray-600 text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter a quest requirement..."
                />
                {requirements.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestRequirement(idx)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Boilerplate Files
          </h2>
          <p className="text-gray-400 mb-6">
            Upload your HTML, CSS, and JS files. They will be zipped together as
            boilerplate code.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-gray-300 font-medium mb-2">
                HTML File
              </label>
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
              <label className="block text-gray-300 font-medium mb-2">
                CSS File
              </label>
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
              <label className="block text-gray-300 font-medium mb-2">
                JavaScript File
              </label>
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
                              handleCheckpointRequirementChange(
                                idx,
                                reqIdx,
                                e.target.value
                              )
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
                              onClick={() =>
                                removeCheckpointRequirement(idx, reqIdx)
                              }
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
                        handleCheckpointChange(
                          idx,
                          "testFile",
                          e.target.files[0]
                        )
                      }
                      className="w-full bg-gray-600 border border-gray-500 text-gray-300 p-3 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-all"
                    />
                    <p className="text-gray-400 text-sm mt-2">
                      Test file should export test functions, for example:
                    </p>
                    <pre className="bg-gray-900 border border-gray-600 p-4 rounded-lg text-sm overflow-auto mt-2 text-gray-300">
                      {`function testAppTitle() {
    const title = document.getElementById('app-title');
    if (!title || title.tagName !== 'H1') {
        return { passed: false, message: 'h1 element with id="app-title" not found' };
    }
    return { passed: true, message: 'App title exists and is correct' };
}`}
                    </pre>
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
    </div>
  );
}
