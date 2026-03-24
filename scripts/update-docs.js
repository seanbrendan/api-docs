#!/usr/bin/env node

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// const SWAGGER_URL = 'https://api.sportsvisio-api.com/api-docs/public-json';
const SWAGGER_URL = 'http://localhost:3000/api-docs/public-json';

const HTML_FILE = path.join(__dirname, '..', 'docs', 'index.html');

// Markers in HTML to identify the API Reference section
const START_MARKER = '<div id="no-results">No endpoints match your search.</div>';
const END_MARKER = '</section>\n\n<footer class="footer">';

function fetchSwagger(url, auth = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: {}
    };

    if (auth) {
      const base64Auth = Buffer.from(auth).toString('base64');
      options.headers['Authorization'] = `Basic ${base64Auth}`;
    }

    // Choose http or https based on protocol
    const protocol = urlObj.protocol === 'https:' ? https : http;

    protocol.get(options, (res) => {
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
  if (!str && str !== 0) return '';
  const strValue = String(str);
  return strValue
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

  const requiredParams = parameters.filter(p => p.required);
  const optionalParams = parameters.filter(p => !p.required);

  if (requiredParams.length === 0 && optionalParams.length === 0) return '';

  let html = '<h4>Parameters</h4>\n';

  // Only show tabs if there are both required and optional parameters
  if (requiredParams.length > 0 && optionalParams.length > 0) {
    const reqId = 'req-' + Math.random().toString(36).substring(2, 11);
    const optId = 'opt-' + Math.random().toString(36).substring(2, 11);

    html += `<div class="param-tabs">
<button class="param-tab active" onclick="switchParamTab(event, '${reqId}', '${optId}')">Required</button>
<button class="param-tab" onclick="switchParamTab(event, '${optId}', '${reqId}')">Optional</button>
</div>
`;

    html += `<div id="${reqId}" class="param-tab-content active">
<table class="param-table"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr></thead><tbody>
`;
    for (const param of requiredParams) {
      const type = param.schema?.type || 'string';
      const description = escapeHtml(param.description || '');
      html += `<tr><td><span class="param-name">${escapeHtml(param.name)}</span></td><td><span class="param-in">${param.in}</span></td><td><span class="param-type">${type}</span></td><td>${description}</td></tr>
`;
    }
    html += `</tbody></table>
</div>
`;

    html += `<div id="${optId}" class="param-tab-content">
<table class="param-table"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr></thead><tbody>
`;
    for (const param of optionalParams) {
      const type = param.schema?.type || 'string';
      const description = escapeHtml(param.description || '');
      html += `<tr><td><span class="param-name">${escapeHtml(param.name)}</span></td><td><span class="param-in">${param.in}</span></td><td><span class="param-type">${type}</span></td><td>${description}</td></tr>
`;
    }
    html += `</tbody></table>
</div>
`;
  } else {
    // If only required or only optional parameters, show without tabs
    const paramsToShow = requiredParams.length > 0 ? requiredParams : optionalParams;
    html += `<table class="param-table"><thead><tr><th>Name</th><th>In</th><th>Type</th><th>Description</th></tr></thead><tbody>
`;
    for (const param of paramsToShow) {
      const type = param.schema?.type || 'string';
      const description = escapeHtml(param.description || '');
      html += `<tr><td><span class="param-name">${escapeHtml(param.name)}</span></td><td><span class="param-in">${param.in}</span></td><td><span class="param-type">${type}</span></td><td>${description}</td></tr>
`;
    }
    html += `</tbody></table>
`;
  }

  return html;
}

function resolveRef(swagger, ref) {
  if (!ref || !ref.startsWith('#/')) return null;

  const parts = ref.substring(2).split('/');
  let current = swagger;

  for (const part of parts) {
    if (!current[part]) return null;
    current = current[part];
  }

  return current;
}

// Helper to convert allOf schema to a merged object schema
function formatSchemaToObject(schema, swagger) {
  if (!schema.allOf) return schema;

  const mergedProps = {};
  const mergedRequired = new Set();

  for (const subSchema of schema.allOf) {
    let resolved = subSchema.$ref ? resolveRef(swagger, subSchema.$ref) : subSchema;

    if (resolved) {
      // Handle nested allOf recursively
      if (resolved.allOf) {
        resolved = formatSchemaToObject(resolved, swagger);
      }

      // Merge properties
      if (resolved.properties) {
        Object.assign(mergedProps, resolved.properties);
      }
      // Merge required fields
      if (resolved.required) {
        resolved.required.forEach(r => mergedRequired.add(r));
      }
    }
  }

  return {
    type: 'object',
    properties: mergedProps,
    required: Array.from(mergedRequired)
  };
}

function formatSchemaExample(schema, swagger, depth = 0, indent = '') {
  if (depth > 10) return '...'; // Prevent infinite recursion

  if (!schema) return null;

  // Resolve $ref
  if (schema.$ref) {
    const resolved = resolveRef(swagger, schema.$ref);
    if (resolved) {
      schema = resolved;
    } else {
      // If can't resolve, show the ref name
      const refName = schema.$ref.split('/').pop();
      return `<${refName}>`;
    }
  }

  // Handle allOf - merge all schemas together
  if (schema.allOf) {
    schema = formatSchemaToObject(schema, swagger);
  }

  // Handle oneOf/anyOf - just show the first option
  if (schema.oneOf || schema.anyOf) {
    const options = schema.oneOf || schema.anyOf;
    if (options.length > 0) {
      const firstOption = options[0].$ref ? resolveRef(swagger, options[0].$ref) : options[0];
      if (firstOption) {
        return formatSchemaExample(firstOption, swagger, depth, indent);
      }
    }
  }

  // Handle arrays
  if (schema.type === 'array') {
    const items = schema.items ? formatSchemaExample(schema.items, swagger, depth + 1, indent + '  ') : '...';
    if (items === null) return '[...]';
    return `[\n${indent}  ${items}\n${indent}]`;
  }

  // Handle objects
  if (schema.type === 'object' || schema.properties) {
    const props = [];
    const properties = schema.properties || {};
    const propKeys = Object.keys(properties);

    if (propKeys.length === 0) {
      return null; // Return null for empty objects
    }

    for (const key of propKeys) {
      const prop = properties[key];
      const value = formatSchemaExample(prop, swagger, depth + 1, indent + '  ');

      if (value !== null) {
        props.push(`${indent}  "${key}": ${value}`);
      }
    }

    return props.length ? `{\n${props.join(',\n')}\n${indent}}` : null;
  }

  // Handle primitive types with better formatting
  switch (schema.type) {
    case 'string':
      if (schema.enum) {
        return `"${schema.enum[0] || 'string'}"`;
      }
      return schema.example ? `"${schema.example}"` : '"string"';
    case 'integer':
      return schema.example !== undefined ? schema.example : 0;
    case 'number':
      return schema.example !== undefined ? schema.example : 0;
    case 'boolean':
      return schema.example !== undefined ? schema.example : true;
    default:
      if (schema.example !== undefined) {
        return JSON.stringify(schema.example);
      }
      return null;
  }
}

function generateResponseSection(responses, swagger) {
  if (!responses) return '';

  let html = '<h4>Responses</h4>\n';

  // Process successful responses first (2xx), then client errors (4xx), then server errors (5xx)
  const sortedCodes = Object.keys(responses).sort((a, b) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    return numA - numB;
  });

  for (const code of sortedCodes) {
    const response = responses[code];
    const codeNum = parseInt(code);
    let cssClass = 'success';
    if (codeNum >= 400 && codeNum < 500) cssClass = 'client-error';
    else if (codeNum >= 500) cssClass = 'server-error';

    const desc = response.description || '';
    html += `<div class="response-codes"><span class="response-code ${cssClass}">${code} ${escapeHtml(desc)}</span></div>\n`;

    // Check for response body schema
    const content = response.content;
    if (content && content['application/json']) {
      const schema = content['application/json'].schema;
      if (schema) {
        const example = formatSchemaExample(schema, swagger, 0, '');
        if (example) {
          html += `<div class="code-block"><div class="code-block-header"><span>Response Body</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div>\n`;
          html += `<pre><code>${escapeHtml(example)}</code></pre></div>\n`;
        }
      }
    }
  }

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

function generateEndpointCard(method, path, operation, baseUrl, swagger) {
  const summary = operation.summary || '';
  const description = operation.description || '';
  const parameters = operation.parameters || [];
  const searchData = generateSearchData(method, path, summary, description, parameters);

  // Generate a unique ID for the endpoint
  const endpointId = `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;

  return `<div class="endpoint-card" id="${endpointId}" data-search="${escapeHtml(searchData)}">
<div class="endpoint-header" onclick="toggleEndpoint(this)">
<span class="method-badge ${getMethodClass(method)}">${method.toUpperCase()}</span>
<span class="endpoint-path">${escapeHtml(path)}</span>
<span class="endpoint-summary">${escapeHtml(summary)}</span>
<button class="endpoint-link-btn" onclick="event.stopPropagation(); copyEndpointLink('${endpointId}')" title="Copy link to this endpoint">&#128279;</button>
<span class="endpoint-chevron">&#9654;</span>
</div>
<div class="endpoint-body">
<p class="endpoint-desc">${escapeHtml(description)}</p>
${generateParametersTable(parameters)}
${generateResponseSection(operation.responses, swagger)}
<div class="code-block"><div class="code-block-header"><span>curl</span><button class="copy-btn" onclick="copyCode(this)">Copy</button></div>
<pre><code>${escapeHtml(generateCurlExample(method, path, baseUrl))}</code></pre></div>
</div></div>
`;
}

function generateTagGroup(tagName, endpoints, baseUrl, swagger) {
  const count = endpoints.length;
  const tagId = `tag-${tagName.toLowerCase().replace(/\s+/g, '-')}`;

  let html = `<!-- ${tagName} -->
<div class="tag-group" id="${tagId}">
<div class="tag-group-header"><h3>${escapeHtml(tagName)}</h3><span class="tag-count">${count} endpoint${count !== 1 ? 's' : ''}</span></div>

`;

  for (const ep of endpoints) {
    html += generateEndpointCard(ep.method, ep.path, ep.operation, baseUrl, swagger);
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
    html += generateTagGroup(tagName, endpoints, baseUrl, swagger);
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
