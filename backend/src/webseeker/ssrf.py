import asyncio, ipaddress, os, socket
import httpcore, httpx

ALLOW_PRIVATE = os.getenv("WEBSEEKER_ALLOW_PRIVATE") == "1"   # fixtures/tests only; the Tauri shell never sets it
ALLOWED_PORTS = {80, 443, 8080, 8443}
BLOCKED_NAMES = {"localhost", "metadata.google.internal"}
METADATA = {ipaddress.ip_address(x) for x in ("169.254.169.254", "fd00:ec2::254", "100.100.100.200")}
UA = "InNetWebSeeker/0.1 (local desktop collector)"


class BlockedDestination(Exception):
    pass


def check_ip(ip, allow_private: bool = False) -> None:
    if ip.version == 6 and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    if ip in METADATA or ip.is_link_local or ip.is_multicast or ip.is_unspecified:
        raise BlockedDestination(f"{ip} is always blocked")
    if not allow_private and not ip.is_global:
        raise BlockedDestination(f"{ip} is a private or reserved address")


async def resolve_public(host: str, port: int) -> list[str]:
    name = host.lower().rstrip(".")
    if not ALLOW_PRIVATE:
        if name in BLOCKED_NAMES or name.endswith(".localhost"):
            raise BlockedDestination(f"{host} is blocked")
        if port not in ALLOWED_PORTS:
            raise BlockedDestination(f"port {port} is not allowed")
    infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    ips = []
    for *_, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0].split("%")[0])
        check_ip(ip, ALLOW_PRIVATE)
        ips.append(str(ip))
    if not ips:
        raise BlockedDestination(f"{host} did not resolve")
    return ips


class GuardedBackend(httpcore.AsyncNetworkBackend):
    """Resolve + validate, then connect to the validated IP. TLS still verifies the original hostname."""

    def __init__(self) -> None:
        self._inner = httpcore.AnyIOBackend()

    async def connect_tcp(self, host, port, timeout=None, local_address=None, socket_options=None):
        ip = (await resolve_public(host, port))[0]
        return await self._inner.connect_tcp(ip, port, timeout=timeout,
                                             local_address=local_address, socket_options=socket_options)

    async def connect_unix_socket(self, path, timeout=None, socket_options=None):
        raise BlockedDestination("unix sockets are disabled")

    async def sleep(self, seconds: float) -> None:
        await self._inner.sleep(seconds)


def make_client(timeout: float = 15.0) -> httpx.AsyncClient:
    transport = httpx.AsyncHTTPTransport()
    # Swaps in the guarded pool. Relies on httpx internals: pin versions and keep the rebinding regression test.
    transport._pool = httpcore.AsyncConnectionPool(
        ssl_context=httpx.create_ssl_context(), max_connections=20, network_backend=GuardedBackend())
    return httpx.AsyncClient(transport=transport, follow_redirects=False, timeout=timeout,
                             trust_env=False, headers={"User-Agent": UA})
