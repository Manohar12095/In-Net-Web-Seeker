"""TLS certificate intelligence module.

Performs standard TLS handshakes using Python's ssl library to inspect
public server certificates. All results are strictly labelled 'observed'
or 'unavailable' per the trust model.
"""
from __future__ import annotations
import asyncio
import hashlib
import ssl
from datetime import datetime, timezone
from typing import Any


def _format_date(d_str: str | None) -> str | None:
    if not d_str:
        return None
    try:
        # Format usually: 'May 12 12:00:00 2025 GMT'
        dt = datetime.strptime(d_str, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return d_str


def _inspect_cert_sync(host: str, port: int = 443, timeout: float = 6.0) -> dict[str, Any]:
    context = ssl.create_default_context()
    context.check_hostname = False
    context.verify_mode = ssl.CERT_NONE  # Inspect even self-signed or staging certs

    try:
        import socket
        with socket.create_connection((host, port), timeout=timeout) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert_bin = ssock.getpeercert(binary_form=True)
                cipher = ssock.cipher()
                version = ssock.version()
                
                # Also get parsed form if available
                cert_dict = ssock.getpeercert()

        if not cert_bin:
            return {"status": "unavailable", "reason": "No certificate presented"}

        sha256_fp = hashlib.sha256(cert_bin).hexdigest()

        # Parse with cryptography if available for rich X.509 fields
        parsed_info: dict[str, Any] = {
            "tls_version": version,
            "cipher_suite": cipher[0] if cipher else None,
            "fingerprint_sha256": sha256_fp,
            "source": "observed",
        }

        try:
            from cryptography import x509
            from cryptography.x509.oid import NameOID, ExtensionOID
            cert = x509.load_der_x509_certificate(cert_bin)

            # Subject
            subjects = []
            for attr in cert.subject:
                subjects.append(f"{attr.oid._name}={attr.value}")
            parsed_info["subject"] = ", ".join(subjects)

            # Common Name
            cns = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)
            parsed_info["common_name"] = cns[0].value if cns else None

            # Issuer
            issuers = []
            for attr in cert.issuer:
                issuers.append(f"{attr.oid._name}={attr.value}")
            parsed_info["issuer"] = ", ".join(issuers)

            # Issuer Organization
            orgs = cert.issuer.get_attributes_for_oid(NameOID.ORGANIZATION_NAME)
            parsed_info["issuer_org"] = orgs[0].value if orgs else None

            # Dates
            not_before = cert.not_valid_before_utc
            not_after = cert.not_valid_after_utc
            now = datetime.now(timezone.utc)
            days_left = (not_after - now).days

            parsed_info["not_before"] = not_before.isoformat()
            parsed_info["not_after"] = not_after.isoformat()
            parsed_info["days_remaining"] = days_left
            parsed_info["is_expired"] = now > not_after

            # SANs (Subject Alternative Names)
            sans: list[str] = []
            try:
                san_ext = cert.extensions.get_extension_for_oid(ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
                for name in san_ext.value:
                    sans.append(str(name.value))
            except Exception:
                pass
            parsed_info["sans"] = sans[:50]  # Cap list to 50 for layout safety

            # Serial number
            parsed_info["serial_number"] = hex(cert.serial_number)[2:].upper()

        except Exception as parse_err:
            # Fallback to ssl dict
            if cert_dict:
                parsed_info["subject"] = str(cert_dict.get("subject", []))
                parsed_info["issuer"] = str(cert_dict.get("issuer", []))
                parsed_info["not_before"] = _format_date(cert_dict.get("notBefore"))
                parsed_info["not_after"] = _format_date(cert_dict.get("notAfter"))

        parsed_info["status"] = "observed"
        return parsed_info

    except Exception as e:
        return {
            "status": "unavailable",
            "reason": str(e),
            "source": "unavailable",
        }


async def inspect(host: str, port: int = 443) -> dict[str, Any]:
    """Inspect the TLS certificate of a host asynchronously."""
    return await asyncio.to_thread(_inspect_cert_sync, host, port)
