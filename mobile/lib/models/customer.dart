/// Maps the backend's `CustomerJson` (`GET /customer/me`).
class Customer {
  final int? id;
  final String? uuid;
  final int? tenantId;
  final String name;
  final String email;
  final String phone;
  final String dateOfBirth;
  final String gender;
  final String province;
  final String city;
  final int? clinicalPlanId;
  final int? prepareMealId;
  final bool? mobileEnabled;
  final String? photo;
  final String? photoUrl;
  final String? photoBase64;
  final int? userId;

  const Customer({
    this.id,
    this.uuid,
    this.tenantId,
    required this.name,
    required this.email,
    required this.phone,
    required this.dateOfBirth,
    required this.gender,
    required this.province,
    required this.city,
    this.clinicalPlanId,
    this.prepareMealId,
    this.mobileEnabled,
    this.photo,
    this.photoUrl,
    this.photoBase64,
    this.userId,
  });

  /// Backend-confirmed values are "Feminino" / "Masculino" / "Outro"
  /// (default "Feminino"); only an exact "Masculino" is treated as male.
  bool get isMale => gender == 'Masculino';

  String get firstName =>
      name.trim().isEmpty ? name : name.trim().split(' ').first;

  factory Customer.fromJson(Map<String, dynamic> json) {
    return Customer(
      id: json['id'] as int?,
      uuid: json['uuid'] as String?,
      tenantId: json['tenantId'] as int?,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String,
      dateOfBirth: json['dateOfBirth'] as String,
      gender: json['gender'] as String,
      province: json['province'] as String,
      city: json['city'] as String,
      clinicalPlanId: json['clinicalPlanId'] as int?,
      prepareMealId: json['prepareMealId'] as int?,
      mobileEnabled: json['mobileEnabled'] as bool?,
      photo: json['photo'] as String?,
      photoUrl: json['photoUrl'] as String?,
      photoBase64: json['photoBase64'] as String?,
      userId: json['userId'] as int?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'uuid': uuid,
    'tenantId': tenantId,
    'name': name,
    'email': email,
    'phone': phone,
    'dateOfBirth': dateOfBirth,
    'gender': gender,
    'province': province,
    'city': city,
    'clinicalPlanId': clinicalPlanId,
    'prepareMealId': prepareMealId,
    'mobileEnabled': mobileEnabled,
    'photo': photo,
    'photoUrl': photoUrl,
    'photoBase64': photoBase64,
    'userId': userId,
  };
}
