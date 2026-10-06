# Security Policy

## Reporting a vulnerability

If you find a security issue in afrigov-images, please do not open a public issue.

Use GitHub's private reporting form:
https://github.com/afrigov/afrigov-images/security/advisories/new

Or email **xanderabim@gmail.com** with "afrigov-images security" in the subject.

You will get an acknowledgement within 72 hours and a fix or a plan within 14 days for
confirmed issues. Credit is given in the release notes unless you prefer otherwise.

## Scope

afrigov-images reads image files on your computer and writes smaller copies. It makes no network
requests. Things that count as vulnerabilities:

- Location, camera or other personal data surviving into an output file when the documentation
  says it is removed.
- Writing outside the output folder you name.
- A crafted image file that makes the tool run code. Image decoding is done by sharp and libvips;
  report those upstream as well.
