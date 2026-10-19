# SageMath: small-private-exponent RSA via Herrmann-May lattice reduction.
# Run load("boneh-durfee.sage"), then boneh_durfee(N, e, X, Y).
# X bounds k=(e*d-1)/phi(N); Y bounds p+q. No factoring oracle is used.
# Reference: Herrmann and May, PKC 2010, section 3.
# https://www.cits.ruhr-uni-bochum.de/imperia/md/content/may/paper/pkc10_rsa_unraveled.pdf
# Finite parameters and algebraic independence make success heuristic.

def boneh_durfee(N, e, X, Y, m=4, t=2):
    """Return a verified (d, p, q), or None; m,t control the lattice size."""
    N, e, X, Y = map(ZZ, (N, e, X, Y))
    if not (N > 1 and 1 < e < N and X > 1 and Y > 1 and 1 <= t <= m):
        raise ValueError("Require N>1, 1<e<N, X,Y>1 and 1<=t<=m")
    R = PolynomialRing(ZZ, names=('x', 'y', 'u'))
    x, y, u = R.gens()
    f = 1 + x*(N + 1 + y)

    def linearize(g):
        # Replace each x*y by u-1, preserving values when u=1+x*y.
        h = R.zero()
        for (a, b, c), coefficient in g.dict().items():
            j = min(a, b)
            h += coefficient*x^(a-j)*y^(b-j)*u^c*(u-1)^j
        return h

    shifts = [linearize(x^i*f^j*e^(m-j))
              for j in range(m+1) for i in range(m-j+1)]
    shifts += [linearize(y^i*f^j*e^(m-j))
               for i in range(1, t+1) for j in range((m//t)*i, m+1)]
    powers = sorted({power for g in shifts for power in g.dict()})
    monomials = [x^a*y^b*u^c for a, b, c in powers]
    U = 1 + X*Y
    scales = [X^a*Y^b*U^c for a, b, c in powers]
    B = matrix(ZZ, [[g.monomial_coefficient(v)*s
                    for v, s in zip(monomials, scales)] for g in shifts])
    reduced = B.LLL()

    S = PolynomialRing(QQ, names=('a', 'b'))
    a, b = S.gens()
    polynomials = []
    for row in reduced.rows():
        if not row:
            continue
        h = S.zero()
        for coefficient, (i, j, k), scale in zip(row, powers, scales):
            h += (QQ(coefficient)/scale)*a^i*b^j*(1+a*b)^k
        h = S(h * h.denominator())
        if h and h.total_degree() > 0 and h not in polynomials:
            polynomials.append(h)

    T = PolynomialRing(QQ, names=('z',))
    z = T.gen()
    for i, g in enumerate(polynomials):
        for h in polynomials[i+1:]:
            resultant = g.resultant(h, a)  # eliminate k; roots are candidates for -(p+q)
            if not resultant or resultant.degree(b) == 0:
                continue
            for y0, _ in T(resultant(a=0, b=z)).roots(ring=ZZ):
                if not -Y < y0 < 0:
                    continue
                s = -y0
                D = s^2 - 4*N
                if D < 0 or not D.is_square():
                    continue
                r = D.isqrt()
                if (s+r) % 2:
                    continue
                p, q = (s+r)//2, (s-r)//2
                if p <= 1 or q <= 1 or p == q or p*q != N:
                    continue
                if not (p.is_prime() and q.is_prime()):
                    continue
                phi = (p-1)*(q-1)
                if gcd(e, phi) != 1:
                    continue
                d = inverse_mod(e, phi)
                k = (e*d-1)//phi
                if 0 < k < X and g(k, y0) == 0 and h(k, y0) == 0:
                    return d, p, q
    return None
