const LANGUAGE_VERSIONS = {
  javascript: "typescript-deno",
  python: "python-3.14",
  java: "openjdk-25",
  cpp: "g++-15",
};

export async function executeCode(req, res) {
  try {
    const { language, code, input = "" } = req.body;
    const onlineCompilerApi = (
      process.env.ONLINECOMPILER_API_URL || "https://api.onlinecompiler.io"
    ).replace(
      /\/$/,
      ""
    );
    const onlineCompilerApiKey = process.env.ONLINECOMPILER_API_KEY;

    if (!language || typeof code !== "string") {
      return res.status(400).json({ success: false, error: "Language and code are required" });
    }

    if (!onlineCompilerApiKey) {
      return res.status(500).json({
        success: false,
        error: "ONLINECOMPILER_API_KEY is not configured on the server",
      });
    }

    const compiler = LANGUAGE_VERSIONS[language.toLowerCase()];

    if (!compiler) {
      return res.status(400).json({ success: false, error: "Unsupported language" });
    }

    const response = await fetch(`${onlineCompilerApi}/api/run-code-sync/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: onlineCompilerApiKey,
      },
      body: JSON.stringify({
        compiler,
        code,
        input,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return res.status(response.status).json({
        success: false,
        error: `OnlineCompiler API error: ${
          errorData?.error || errorData?.message || response.statusText
        }`,
      });
    }

    const data = await response.json();
    const output = data.output || "";
    const stderr = data.error || "";

    if (data.status !== "success" || data.exit_code !== 0 || stderr) {
      return res.status(200).json({
        success: false,
        output,
        error: stderr || `Code exited with status ${data.exit_code}`,
        exitCode: data.exit_code,
        time: data.time,
        memory: data.memory,
      });
    }

    return res.status(200).json({
      success: true,
      output: output || "No output",
      exitCode: data.exit_code,
      time: data.time,
      memory: data.memory,
    });
  } catch (error) {
    console.error("Error executing code", error);
    return res.status(500).json({
      success: false,
      error: `Failed to execute code: ${error.message}`,
    });
  }
}
