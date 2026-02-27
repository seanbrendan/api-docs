#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const SWAGGER_URL = 'https://api.sportsvisio-api.com/api-docs/public-json';
const HTML_FILE = path.join(__dirname, '..', 'docs', 'index.html');

// Markers in HTML to identify the API Reference section
const START_MARKER = '<div id="no-results">No endpoints match your search.</div>';
const END_MARKER = '</section>\n\n<!-- Changelog -->';

function fetchSwagger(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse Swagger JSON'));
        }
      });
    }).on('error', reject);
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getMethodClass(method) {
  return method.toLowerCase();
}

function generateSearchData(method, path, summary, description, parameters) {
  const parts = [
    method.toLowerCase(),
    path.toLowerCase().replace(/[/{}-]/g, ' '),
    (summary || '').toLowerCase(),
    (description || '').toLowerCase(),
    ...(parameters || []).map(p => p.name.toLowerCase())
  ];
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

function generateParametersTable(parameters) {
  if (!parameters || parameters.length === 0) return '';

  let html = `<h4>Parameters</h4>
<table class="param-table"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Required</th><th>Description</th></tr></thead><tbody>
`;

  for (const param of parameters) {
    const type = param.schema?.type || 'string';
    const required = param.required ? 'Yes<span class="param-required">*</span>' : 'No';
    const description = escapeHtml(param.description || '');

    html += `<tr><td><span class="param-name">${escapeHtml(param.name)}</span></td><td><span class="param-in">${param.in}</span></td><td><span class="param-type">${type}</span></td><td>${required}</td><td>${description}</td></tr>
`;
  }

  html += `</tbody></table>
`;
  return html;
}

function generateResponseCodes(responses) {
  if (!responses) return '';

  let html = '<div class="response-codes">';

  for (const [code, response] of Object.entries(responses)) {
    const codeNum = parseInt(code);
    let cssClass = 'success';
    if (codeNum >= 400 && codeNum < 500) cssClass = 'client-error';
    else if (codeNum >= 500) cssClass = 'server-error';

    const desc = response.description || '';
    html += `<span class="response-code ${cssClass}">${code} ${escapeHtml(desc)}</span>`;
  }

  html += '</div>\n';
  return html;
}

function generateCurlExample(method, path, baseUrl) {
  const fullPath = path.replace(/{([^}]+)}/g, '{$1}');
  let curl = `curl -X ${method.toUpperCase()} "${baseUrl}${fullPath}" \\
  -H "Authorization: Bearer YOUR_TOKEN"`;

  if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
    curl += ` \\
  -H "Content-Type: application/json" \\
  -d '{}'`;
  }

  return curl;
}

function generateEndpointCard(method, path, operation, baseUrl) {
  const summary = operation.summary || '';
  const description = operation.description || '';
  const parameters = operation.parameters || [];
  const searchData = generateSearchData(method, path, summary, description, parameters);

  return `<div class="endpoint-card" data-search="${escapeHtml(searchData)}">
<div class="endpoint-header" onclick="toggleEndpoint(this)">
<span class="method-badge ${getMethodClass(method)}">${method.toUpperCase()}</span>
<span class="endpoint-path">${escapeHtml(path)}</span>
<span class="endpoint-summary">${escapeHtml(summary)}</span>
<span class="endpoint-chevron">&#9654;</span>
</div>
<div class="endpoint-body">
<p class="endpoint-desc">${escapeHtml(description)}</p>
${generateParametersTable(parameters)}
${generateResponseCodes(operation.responses)}
<div class="code-block"><div class="code-block-header"><span>curl</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div>
<pre><code>${escapeHtml(generateCurlExample(method, path, baseUrl))}</code></pre></div>
</div></div>
`;
}

function generateTagGroup(tagName, endpoints, baseUrl) {
  const count = endpoints.length;
  const tagId = `tag-${tagName.toLowerCase().replace(/\s+/g, '-')}`;

  let html = `<!-- ${tagName} -->
<div class="tag-group" id="${tagId}">
<div class="tag-group-header"><h3>${escapeHtml(tagName)}</h3><span class="tag-count">${count} endpoint${count !== 1 ? 's' : ''}</span></div>

`;

  for (const ep of endpoints) {
    html += generateEndpointCard(ep.method, ep.path, ep.operation, baseUrl);
    html += '\n';
  }

  html += '</div>\n';
  return html;
}

function generateSidebarLinks(tagGroups) {
  let html = '';

  for (const [tagName, endpoints] of Object.entries(tagGroups)) {
    const tagId = `tag-${tagName.toLowerCase().replace(/\s+/g, '-')}`;
    const count = endpoints.length;

    // Determine badge type based on methods
    const methods = [...new Set(endpoints.map(e => e.method.toLowerCase()))];
    let badgeClass = 'mixed';
    if (methods.length === 1) {
      badgeClass = methods[0];
    }

    html += `  <a href="#${tagId}" class="sidebar-link" onclick="closeMobile()">${escapeHtml(tagName)} <span class="link-badge ${badgeClass}">${count}</span></a>\n`;
  }

  return html;
}

function organizeByTags(swagger) {
  const tagGroups = {};
  const paths = swagger.paths || {};

  // Initialize tags from swagger tags array
  if (swagger.tags) {
    for (const tag of swagger.tags) {
      tagGroups[tag.name] = [];
    }
  }

  // Organize endpoints by tags
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        const tags = operation.tags || ['Other'];
        for (const tag of tags) {
          if (!tagGroups[tag]) {
            tagGroups[tag] = [];
          }
          tagGroups[tag].push({ method, path, operation });
        }
      }
    }
  }

  // Remove empty tags
  for (const tag of Object.keys(tagGroups)) {
    if (tagGroups[tag].length === 0) {
      delete tagGroups[tag];
    }
  }

  return tagGroups;
}

function generateApiReference(swagger) {
  const baseUrl = swagger.servers?.[0]?.url || 'https://api.sportsvisio-api.com';
  const tagGroups = organizeByTags(swagger);

  let html = '\n';

  for (const [tagName, endpoints] of Object.entries(tagGroups)) {
    html += generateTagGroup(tagName, endpoints, baseUrl);
    html += '\n';
  }

  return { html, tagGroups };
}

function updateSidebar(htmlContent, tagGroups) {
  // Find and update the API Reference sidebar section
  const sidebarStart = '<div class="sidebar-section">API Reference</div>';
  const sidebarEnd = '<div class="sidebar-section">More</div>';

  const startIdx = htmlContent.indexOf(sidebarStart);
  const endIdx = htmlContent.indexOf(sidebarEnd);

  if (startIdx === -1 || endIdx === -1) {
    console.warn('Warning: Could not find sidebar markers, sidebar not updated');
    return htmlContent;
  }

  const sidebarLinks = generateSidebarLinks(tagGroups);
  const newSidebar = sidebarStart + '\n' + sidebarLinks + '\n  ';

  return htmlContent.substring(0, startIdx) + newSidebar + htmlContent.substring(endIdx);
}

async function main() {
  console.log('Fetching Swagger from:', SWAGGER_URL);

  try {
    const swagger = await fetchSwagger(SWAGGER_URL);
    console.log('Swagger fetched successfully');
    console.log('API Title:', swagger.info?.title);
    console.log('API Version:', swagger.info?.version);

    const { html: apiReferenceHtml, tagGroups } = generateApiReference(swagger);

    const endpointCount = Object.values(tagGroups).reduce((sum, eps) => sum + eps.length, 0);
    console.log(`Generated ${endpointCount} endpoints across ${Object.keys(tagGroups).length} tags`);

    // Read existing HTML
    let htmlContent = fs.readFileSync(HTML_FILE, 'utf8');

    // Find markers
    const startIdx = htmlContent.indexOf(START_MARKER);
    const endIdx = htmlContent.indexOf(END_MARKER);

    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Could not find API Reference section markers in HTML file');
    }

    // Replace the API Reference content
    const before = htmlContent.substring(0, startIdx + START_MARKER.length);
    const after = htmlContent.substring(endIdx);

    htmlContent = before + '\n' + apiReferenceHtml + after;

    // Update sidebar
    htmlContent = updateSidebar(htmlContent, tagGroups);

    // Write updated HTML
    fs.writeFileSync(HTML_FILE, htmlContent);
    console.log('Updated:', HTML_FILE);
    console.log('Done!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
