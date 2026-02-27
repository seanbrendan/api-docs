# RESTful Consumer API Documentation

This repository contains documentation and infrastructure-as-code for deploying API documentation to AWS.

## Repository Structure

```
.
├── docs/              # Documentation files
│   └── index.html     # API documentation (SportsVisio API)
├── terraform/         # Infrastructure as Code
│   ├── main.tf        # AWS S3 + CloudFront configuration
│   ├── variables.tf   # Configuration variables
│   ├── outputs.tf     # Terraform outputs
│   └── README.md      # Deployment instructions
└── README.md          # This file
```

## Overview

This repository provides:

- **API Documentation**: Static HTML documentation for RESTful APIs
- **AWS Infrastructure**: Terraform configuration to deploy documentation to S3 with CloudFront CDN
- **Cost Optimized**: 100% AWS Free Tier eligible deployment

## Quick Start

### View Documentation Locally

Open [docs/index.html](docs/index.html) in your browser to view the documentation locally.

### Deploy to AWS

1. Navigate to the terraform directory:
   ```bash
   cd terraform
   ```

2. Follow the instructions in [terraform/README.md](terraform/README.md) to deploy to AWS

3. Access your documentation via the CloudFront URL provided after deployment

## Features

- Static HTML documentation with modern, responsive design
- AWS S3 hosting with CloudFront CDN for global distribution
- HTTPS enabled by default
- Zero cost with AWS Free Tier
- Infrastructure as Code with Terraform

## Documentation

- **API Documentation**: Located in [docs/](docs/) directory
- **Deployment Guide**: See [terraform/README.md](terraform/README.md)

## Cost Information

The infrastructure is designed to be completely free under AWS Free Tier:

- S3: First 5GB storage free
- CloudFront: 1TB data transfer free for 12 months
- No custom domain (avoids Route53 costs)
- Default SSL certificate (free)

For detailed cost information, see [terraform/README.md](terraform/README.md#cost-optimization).

## Contributing

To update the API documentation:

1. Edit files in the [docs/](docs/) directory
2. Test locally by opening HTML files in a browser
3. Deploy changes using `terraform apply` from the terraform directory

## License

Copyright 2026 Sports Visio Inc. All rights reserved.
