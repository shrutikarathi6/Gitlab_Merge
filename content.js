(async function () {
  const THRESHOLD = 1;

  //  const token = sessionStorage.getItem("GITLAB_PAT") || prompt("Enter GitLab PAT:");
  //   sessionStorage.setItem("GITLAB_PAT", token);

  const pathMatch = window.location.pathname.match(/^\/([^\/]+)\/([^\/]+)\/-\/merge_requests\/(\d+)/);
  if (!pathMatch) {
    console.log("Not on a valid merge request page.");
    return;
  }

  // Finding username, project name and mr id
  const namespace = pathMatch[1];
  const projectName = pathMatch[2];
  const mrIid = pathMatch[3];
  const projectPath = encodeURIComponent(`${namespace}/${projectName}`);

  console.log(`project: ${namespace}/${projectName}, MR: ${mrIid}`);

  try {

    // projectid
    const projectRes = await fetch(`https://gitlab.com/api/v4/projects/${projectPath}`);
    if (!projectRes.ok) throw new Error("Failed to fetch project");
    const projectData = await projectRes.json();
    const projectId = projectData.id;

    console.log(`Project ID: ${projectId}`);

    // source and target branch
    const mrRes = await fetch(`https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mrIid}`);
    if (!mrRes.ok) throw new Error("Failed to fetch merge request");
    const mrData = await mrRes.json();

    const fromBranch = mrData.source_branch;
    const toBranch = mrData.target_branch;

    console.log(`source=${fromBranch}, target=${toBranch}`);

    // difference between commits
    const compareRes = await fetch(
      `https://gitlab.com/api/v4/projects/${projectId}/repository/compare?from=${fromBranch}&to=${toBranch}`
    );
    const compareData = await compareRes.json();
    const totalCommits = compareData.commits.length;
    console.log(`Branch is ${totalCommits} commit(s) behind.`);

    if (totalCommits > THRESHOLD) {
      const mergeBtn = document.querySelector('[data-testid="merge-button"]');

      if (mergeBtn) {
        // merge button disable
        mergeBtn.disabled = true;
        mergeBtn.style.cursor = "not-allowed";
        mergeBtn.title = "Merge blocked: source branch is behind target branch";
        mergeBtn.style.opacity = "0.6";

        // rebase button added
        const rebaseBtn = document.createElement("button");
        rebaseBtn.innerText = `Rebase (${totalCommits} behind)`;

        rebaseBtn.className = mergeBtn.className;
        rebaseBtn.style.marginLeft = "12px";
        rebaseBtn.style.backgroundColor = "#f5c6cb";
        rebaseBtn.style.color = "#721c24";


        rebaseBtn.onclick = async () => {
          const confirmed = confirm(`The source branch is ${totalCommits} commits behind.\nDo you want to rebase it?`);
          if (!confirmed) return;

          try {
            // rebase url
            const REBASE_API_URL = `https://gitlab.com/api/v4/projects/${projectId}/merge_requests/${mrIid}/rebase`;

            console.log("rebase api :", REBASE_API_URL)

            const response = await fetch(REBASE_API_URL, {
              method: 'PUT',
              headers: {
                'PRIVATE-TOKEN': 'glpat-gjzi7Am3sZKe25zDxvb4'
              }
            });

            const text = await response.text();

            if (!response.ok) throw new Error(`Rebase failed: ${response.status}`);
            alert("✅ Rebase triggered successfully.");
            window.location.reload();

          } catch (err) {
            console.error(`Rebase error: ${err.message}`);
            alert(`Rebase failed: ${err.message}`);
          }
        };


        mergeBtn.parentNode.insertBefore(rebaseBtn, mergeBtn.nextSibling);
      }
    }


  } catch (err) {
    console.error(` Error: ${err.message}`);
  }
})();
