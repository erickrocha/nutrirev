/// Maps the backend's `AccessTokenJson`, returned by both `POST /login`
/// and `POST /refresh`.
class AuthToken {
  final String accessToken;
  final String tokenType;

  /// Despite the name, this is the ABSOLUTE Unix-epoch-seconds expiry
  /// timestamp of [accessToken], not a duration.
  final int expireIn;
  final String? refreshToken;
  final String email;
  final String uuid;
  final String name;
  final int userId;
  final String role;
  final int? tenantId;
  final bool firstLogin;

  const AuthToken({
    required this.accessToken,
    required this.tokenType,
    required this.expireIn,
    this.refreshToken,
    required this.email,
    required this.uuid,
    required this.name,
    required this.userId,
    required this.role,
    this.tenantId,
    required this.firstLogin,
  });

  static const _expiryBufferSeconds = 30;

  bool get isExpired {
    final nowSeconds = DateTime.now().toUtc().millisecondsSinceEpoch ~/ 1000;
    return nowSeconds >= (expireIn - _expiryBufferSeconds);
  }

  factory AuthToken.fromJson(Map<String, dynamic> json) {
    return AuthToken(
      accessToken: json['accessToken'] as String,
      tokenType: json['tokenType'] as String? ?? 'Bearer',
      expireIn: json['expireIn'] as int,
      refreshToken: json['refreshToken'] as String?,
      email: json['email'] as String,
      uuid: json['uuid'] as String,
      name: json['name'] as String,
      userId: json['userId'] as int,
      role: json['role'] as String,
      tenantId: json['tenantId'] as int?,
      firstLogin: json['firstLogin'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'tokenType': tokenType,
    'expireIn': expireIn,
    'refreshToken': refreshToken,
    'email': email,
    'uuid': uuid,
    'name': name,
    'userId': userId,
    'role': role,
    'tenantId': tenantId,
    'firstLogin': firstLogin,
  };

  AuthToken copyWith({bool? firstLogin}) => AuthToken(
    accessToken: accessToken,
    tokenType: tokenType,
    expireIn: expireIn,
    refreshToken: refreshToken,
    email: email,
    uuid: uuid,
    name: name,
    userId: userId,
    role: role,
    tenantId: tenantId,
    firstLogin: firstLogin ?? this.firstLogin,
  );
}
